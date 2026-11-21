import React, { forwardRef } from 'react';
import { Button as AtriumButton } from '@/atrium/core';
import type { ButtonProps, Tone, Size } from '@/atrium/core';

export type LiveButtonTone = Tone;
export type LiveButtonSize = Size;

export interface LiveButtonProps extends Omit<ButtonProps, 'tone' | 'size'> {
  tone?: LiveButtonTone;
  size?: LiveButtonSize;
}

export const LiveButton = forwardRef<HTMLButtonElement, LiveButtonProps>(
  function LiveButton(props, ref) {
    return <AtriumButton ref={ref} {...props} />;
  }
);

LiveButton.displayName = 'LiveButton';
