import React, { forwardRef, useEffect } from 'react';
import { initGlobalButtonDelegation } from '../../../utils/atriumSprings';

export type LiveButtonTone = 'accent' | 'outline' | 'soft' | 'success';
export type LiveButtonSize = 'sm' | 'md' | 'lg' | number;

export interface LiveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: LiveButtonTone;
  size?: LiveButtonSize;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  iconOnly?: boolean;
}

const Za = {
  root: 'a',
  lq: 't',
  tx: 'h',
  accent: 'v',
  outline: 'b',
  soft: 'g',
  success: 'u',
  icon: 'f',
};

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

export const LiveButton = forwardRef<HTMLButtonElement, LiveButtonProps>(function LiveButton(
  {
    tone = 'accent',
    size,
    leading,
    trailing,
    iconOnly,
    className = '',
    style,
    type = 'button',
    children,
    ...props
  },
  ref
) {
  useEffect(() => {
    initGlobalButtonDelegation();
  }, []);

  const sizeProps = getSizeProps(size, style);
  const classes = [
    Za.root,
    Za[tone] || Za.accent,
    iconOnly ? Za.icon : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      data-atr-liquid=""
      {...sizeProps}
      {...props}
    >
      <span className={Za.lq} data-atr-lq="" aria-hidden="true" />
      <span className={Za.tx}>
        {leading}
        {children}
        {trailing}
      </span>
    </button>
  );
});

LiveButton.displayName = 'LiveButton';
