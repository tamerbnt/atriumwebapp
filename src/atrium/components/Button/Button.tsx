'use client';

import { forwardRef, useEffect } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { installLiquid } from '../../motion/liquid';
import { cx, sizeProps } from '../../hooks';
import type { Size } from '../../hooks';
import s from './Button.module.css';

export type Tone = 'accent' | 'outline' | 'soft' | 'success';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** accent: brand orange · outline · soft: neutral · success: green */
  tone?: Tone;
  /** sm / md / lg = 28 / 34 / 44 px, a number of px, or omit to inherit --atr-h from the context */
  size?: Size;
  /** any inline SVG, e.g. a Lucide icon */
  leading?: ReactNode;
  trailing?: ReactNode;
  /** square button for a single icon; give it an aria-label */
  iconOnly?: boolean;
  children?: ReactNode;
}

/**
 * The Atrium liquid button.
 *
 * Plain <button> underneath: keyboard, focus ring, forms, disabled and aria all behave natively.
 * The liquid motion is attached by one delegated listener for the whole page, so a thousand
 * buttons cost the same as one until you touch them.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { tone = 'accent', size, leading, trailing, iconOnly, className, style, type = 'button', children, ...rest },
  ref,
) {
  useEffect(() => installLiquid(), []);
  const sp = sizeProps(size, style);
  return (
    <button
      ref={ref}
      type={type}
      className={cx(s.root, s[tone], iconOnly && s.icon, className)}
      data-atr-liquid=""
      {...sp}
      {...rest}
    >
      <span className={s.lq} data-atr-lq="" aria-hidden="true" />
      <span className={s.tx}>
        {leading}
        {children}
        {trailing}
      </span>
    </button>
  );
});
