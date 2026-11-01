import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { useAppleOverscroll, UseAppleOverscrollOptions } from '../../hooks/useAppleOverscroll';

export interface AppleOverscrollContainerProps extends UseAppleOverscrollOptions {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  style?: React.CSSProperties;
}

export const AppleOverscrollContainer = forwardRef<HTMLDivElement, AppleOverscrollContainerProps>(
  (
    {
      children,
      className = '',
      contentClassName = '',
      style,
      direction = 'vertical',
      enabled = true,
      stiffness,
      damping,
      mass,
      maxBounce,
    },
    ref
  ) => {
    const internalRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => internalRef.current as HTMLDivElement);

    useAppleOverscroll(internalRef, {
      direction,
      enabled,
      stiffness,
      damping,
      mass,
      maxBounce,
      targetContentSelector: '.apple-overscroll-content',
    });

    return (
      <div
        ref={internalRef}
        style={style}
        className={`relative ${
          direction === 'horizontal'
            ? 'overflow-x-auto overflow-y-hidden'
            : direction === 'vertical'
            ? 'overflow-y-auto overflow-x-hidden'
            : 'overflow-auto'
        } ${className}`}
      >
        <div className={`apple-overscroll-content min-w-full ${contentClassName}`}>
          {children}
        </div>
      </div>
    );
  }
);

AppleOverscrollContainer.displayName = 'AppleOverscrollContainer';
