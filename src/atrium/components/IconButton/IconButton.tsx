'use client';

import { forwardRef, useEffect, useRef } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { kickScale, kickSpin } from '../../motion/liquid';
import { cx, sizeProps } from '../../hooks';
import { Button } from '../Button/Button';
import type { ButtonProps } from '../Button/Button';
import s from './IconButton.module.css';

/* ------------------------------------------------------------------ Badge */

export interface BadgeProps {
  /** a count or short text. Zero renders nothing unless `showZero` */
  value: number | string;
  /** counts above this show as "99+" */
  max?: number;
  showZero?: boolean;
  /** true (default): pinned to the top-right corner of a position:relative parent */
  floating?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** A small count. When the number goes up it pops on a springy bounce. Decorative: put the count in the control's aria-label. */
export function Badge({ value, max = 99, showZero = false, floating = true, className, style }: BadgeProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);

  useEffect(() => {
    if (typeof value === 'number' && typeof prev.current === 'number' && value > prev.current && ref.current) {
      kickScale(ref.current);
    }
    prev.current = value;
  }, [value]);

  if (value === '' || (value === 0 && !showZero)) return null;
  const text = typeof value === 'number' && value > max ? `${max}+` : String(value);
  return (
    <span ref={ref} className={cx(s.badge, floating ? s.floating : s.inline, className)} style={style} aria-hidden="true">
      {text}
    </span>
  );
}

/* ------------------------------------------------------------------ StatusDot */

/** The little green dot used in "Online" style pills. Decorative. */
export function StatusDot({ className }: { className?: string }) {
  return <i className={cx(s.dot, className)} aria-hidden="true" />;
}

/* ------------------------------------------------------------------ IconButton */

export interface IconButtonProps extends Omit<ButtonProps, 'iconOnly' | 'leading' | 'trailing' | 'children' | 'aria-label'> {
  /** the icon, any inline SVG */
  icon: ReactNode;
  /** required: icon-only buttons have no text. Include a badge count here, e.g. "Notifications, 5 unread" */
  'aria-label': string;
  /** optional corner count */
  badge?: number | string;
  /** 'spin': one slow turn of the icon on every click (refresh) */
  kick?: 'spin';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, badge, kick, size, style, tone = 'soft', onClick, ...rest },
  ref,
) {
  const handle = (e: MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (kick === 'spin' && !e.defaultPrevented) {
      const svg = e.currentTarget.querySelector('svg');
      if (svg) kickSpin(svg);
    }
  };

  if (badge === undefined) {
    return <Button ref={ref} iconOnly tone={tone} size={size} style={style} onClick={handle} leading={icon} {...rest} />;
  }
  // with a badge the size lives on the wrapper so button and badge scale together
  const sp = sizeProps(size, style);
  return (
    <span className={s.wrap} {...sp}>
      <Button ref={ref} iconOnly tone={tone} onClick={handle} leading={icon} {...rest} />
      <Badge value={badge} />
    </span>
  );
});
