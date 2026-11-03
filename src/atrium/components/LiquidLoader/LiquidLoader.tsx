'use client';

import { forwardRef, useEffect, useId, useRef } from 'react';
import type { HTMLAttributes, PointerEvent } from 'react';
import { cx, useIsoLayoutEffect } from '../../hooks';
import { initMotionEnv, motion } from '../../motion/env';
import { LoaderBody } from './loaderBody';
import s from './LiquidLoader.module.css';

export interface LiquidLoaderProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** side in px (default 56) */
  size?: number;
  /** animate (default true). false parks it as the solid logo mark. */
  active?: boolean;
  /** accessible name, read by screen readers */
  label?: string;
  /** click stirs the liquid (default true) */
  stirrable?: boolean;
}

/**
 * Four squares melt into a swirl, then re-solidify; the total area never changes.
 * Uses the shared loop (one rAF for the whole page). Offscreen it does not run. With reduced motion
 * or the `off` tier it shows the solid mark with a soft CSS pulse instead.
 */
export const LiquidLoader = forwardRef<HTMLSpanElement, LiquidLoaderProps>(function LiquidLoader(
  { size = 56, active = true, label = 'Loading', stirrable = true, className, style, ...rest },
  ref,
) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const host = useRef<HTMLSpanElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const ring = useRef<SVGPathElement>(null);
  const parts = useRef<SVGPathElement>(null);
  const blur = useRef<SVGFEGaussianBlurElement>(null);
  const body = useRef<LoaderBody | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useIsoLayoutEffect(() => {
    if (!host.current || !ring.current || !parts.current || !blur.current) return;
    initMotionEnv();
    const b = new LoaderBody({ host: host.current, ring: ring.current, parts: parts.current, blur: blur.current });
    body.current = b;
    b.running = activeRef.current;
    b.snap();
    b.render();
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((e) => {
        b.visible = e[e.length - 1]?.isIntersecting ?? true;
        if (b.visible) b.wakeUp();
      });
      io.observe(host.current);
    }
    if (activeRef.current) b.start();
    return () => {
      io?.disconnect();
      b.dispose();
      body.current = null;
    };
  }, []);

  useEffect(() => {
    const b = body.current;
    if (!b) return;
    if (active) b.start();
    else b.stop();
  }, [active]);

  const onPointerDown = (e: PointerEvent<HTMLSpanElement>) => {
    const b = body.current;
    const el = svg.current;
    if (!b || !el || !stirrable || motion.instant) return;
    const r = el.getBoundingClientRect();
    b.stir(((e.clientX - r.left) / r.width) * 220 - 10, ((e.clientY - r.top) / r.height) * 220 - 10);
  };

  return (
    <span
      ref={(n) => {
        host.current = n;
        if (typeof ref === 'function') ref(n);
        else if (ref) (ref as { current: HTMLSpanElement | null }).current = n;
      }}
      role="status"
      aria-label={label}
      className={cx(s.root, active && s.pulse, stirrable && s.stir, className)}
      style={{ width: size, height: size, ...style }}
      onPointerDown={onPointerDown}
      {...rest}
    >
      <svg ref={svg} viewBox="-10 -10 220 220" aria-hidden="true" focusable="false" className={s.svg}>
        <defs>
          <filter id={`${uid}g`} filterUnits="userSpaceOnUse" x={-10} y={-10} width={220} height={220}>
            <feGaussianBlur ref={blur} in="SourceGraphic" stdDeviation={0.01} result="b" />
            <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
          </filter>
        </defs>
        <path ref={ring} className={s.ring} fillRule="evenodd" d="M0 0" />
        <g filter={`url(#${uid}g)`}>
          <path ref={parts} className={s.parts} d="M0 0" />
        </g>
      </svg>
    </span>
  );
});
