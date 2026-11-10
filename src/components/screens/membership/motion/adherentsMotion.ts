/**
 * Shared Motion Engine for Membership Screen Components
 * Extracted from Adherents.dc.html prototype.
 *
 * Physics:
 * - Frame-based spring:
 *   v += (target - x) * k * dt;
 *   v *= Math.pow(d, dt);
 *   x += v * dt;
 * - k = 0.08 + (tune / 100) * 0.16
 * - d = 0.62 + (tune / 100) * 0.2 (typical tune: 20-30)
 * - dt is normalized in 60ths of a second: clamp((t - prev) / 16.67, 0, 2.5)
 * - Settled condition: |target - x| < 0.02 && |v| < 0.02
 * - Reduced motion support: snaps immediately to target without bounce.
 * - Single auto-parking rAF loop.
 */

import { useState, useEffect, useRef } from 'react';

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

let isReducedMotionOverride: boolean | null = null;

export const setReducedMotionOverride = (override: boolean | null): void => {
  isReducedMotionOverride = override;
};

export const checkReducedMotion = (): boolean => {
  if (isReducedMotionOverride !== null) return isReducedMotionOverride;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
};

export type SpringListener = (value: number, spring: Sp) => void;

const activeSprings = new Set<Sp>();
let rafId = 0;
let prevTime = 0;

export const getActiveSpringCount = (): number => activeSprings.size;

export const frame = (timestamp: number): void => {
  rafId = 0;
  const dt = prevTime ? clamp((timestamp - prevTime) / 16.67, 0, 2.5) : 1;
  prevTime = timestamp;

  const reduced = checkReducedMotion();

  // Step each spring
  activeSprings.forEach((s) => s.step(dt, reduced));

  // Check if all settled
  let allRest = true;
  for (const s of activeSprings) {
    if (!s.rest()) {
      allRest = false;
      break;
    }
  }

  if (allRest) {
    activeSprings.forEach((s) => {
      s.snap();
      s.notify();
    });
    prevTime = 0;
    // parks loop automatically
  } else {
    rafId = requestAnimationFrame(frame);
  }
};

export const wake = (): void => {
  if (!rafId && typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    rafId = requestAnimationFrame(frame);
  }
};

export const TUNES = {
  rowPresence: 24,
  rowExpand: 26,
  modal: 28,
  bulkBar: 26,
  toast: 26,
  metricCountUp: 20,
} as const;

export class Sp {
  x: number;
  v = 0;
  t: number;
  k: number;
  d: number;
  tune: number;
  private listeners = new Set<SpringListener>();

  constructor(x: number, tune = 24) {
    this.x = x;
    this.t = x;
    this.tune = tune;
    this.k = 0.08 + (tune / 100) * 0.16;
    this.d = 0.62 + (tune / 100) * 0.2;
    activeSprings.add(this);
  }

  get target(): number {
    return this.t;
  }

  set target(val: number) {
    this.setTarget(val);
  }

  step(dt: number, reduced = checkReducedMotion()): void {
    if (reduced) {
      this.x = this.t;
      this.v = 0;
      this.notify();
      return;
    }

    this.v += (this.t - this.x) * this.k * dt;
    this.v *= Math.pow(this.d, dt);
    this.x += this.v * dt;

    if (this.rest()) {
      this.snap();
      return;
    }

    this.notify();
  }

  rest(): boolean {
    return Math.abs(this.t - this.x) < 0.02 && Math.abs(this.v) < 0.02;
  }

  snap(): void {
    this.x = this.t;
    this.v = 0;
    this.notify();
  }

  setTarget(target: number): void {
    if (this.t !== target) {
      this.t = target;
      if (checkReducedMotion()) {
        this.snap();
      } else {
        wake();
      }
    }
  }

  subscribe(listener: SpringListener): () => void {
    this.listeners.add(listener);
    // Notify immediately with current value
    listener(this.x, this);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(): void {
    this.listeners.forEach((fn) => fn(this.x, this));
  }

  destroy(): void {
    activeSprings.delete(this);
    this.listeners.clear();
  }
}

/**
 * useSpring Hook
 * Connects a component to a spring target value (0..100 or pixels).
 * Settles automatically and parks when idle.
 */
export function useSpring(
  target: number,
  tune = 22,
  options?: {
    immediate?: boolean;
    onRest?: () => void;
  }
): number {
  const [val, setVal] = useState<number>(target);
  const springRef = useRef<Sp | null>(null);
  const onRestRef = useRef(options?.onRest);
  onRestRef.current = options?.onRest;

  // Initialize spring instance once
  if (!springRef.current) {
    springRef.current = new Sp(target, tune);
  }

  useEffect(() => {
    const s = springRef.current!;
    if (options?.immediate) {
      s.t = target;
      s.snap();
      setVal(target);
      return;
    }

    const unsub = s.subscribe((v) => {
      setVal(v);
      if (s.rest() && onRestRef.current) {
        onRestRef.current();
      }
    });

    s.setTarget(target);

    return () => {
      unsub();
    };
  }, [target, options?.immediate]);

  useEffect(() => {
    return () => {
      if (springRef.current) {
        springRef.current.destroy();
        springRef.current = null;
      }
    };
  }, []);

  return val;
}

/**
 * useSpringCount Hook
 * Metric count-up spring (tune 20 by default).
 * Returns integer value rounded from spring x.
 */
export function useSpringCount(target: number, tune = TUNES.metricCountUp): number {
  const val = useSpring(target, tune);
  return Math.round(val);
}
