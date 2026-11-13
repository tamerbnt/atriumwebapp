/**
 * Shared Motion Engine for Membership Screen Components
 * Ported from Adherents.dc.html prototype.
 *
 * - Single shared requestAnimationFrame loop (auto-parks when every spring rests)
 * - Direct DOM writes via `subscribeFrame()` to avoid per-frame React re-renders
 * - Exact spring physics:
 *   k = 0.08 + (tune / 100) * 0.16
 *   d = 0.62 + (tune / 100) * 0.2
 *   rest(): |t - x| < 0.02 && |v| < 0.02
 * - Preserves velocity & position on mid-motion retargeting
 * - Snaps immediately when `prefers-reduced-motion: reduce` is active
 */

import { useState, useEffect, useRef } from 'react';
import {
  clamp,
  computeSpringCoefficients,
  TUNES,
  ROW_H,
  ROW_G,
  ROW_DH,
  ROW_B,
  CARD_H,
} from './adherentsMath';

export { clamp, TUNES, ROW_H, ROW_G, ROW_DH, ROW_B, CARD_H };

let isReducedMotionOverride: boolean | null = null;
let cachedReducedMotion: boolean | null = null;
let reducedMotionListenerBound = false;

export const setReducedMotionOverride = (override: boolean | null): void => {
  isReducedMotionOverride = override;
};

export const checkReducedMotion = (): boolean => {
  if (isReducedMotionOverride !== null) return isReducedMotionOverride;
  if (cachedReducedMotion !== null) return cachedReducedMotion;
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    cachedReducedMotion = mq.matches;
    if (!reducedMotionListenerBound) {
      reducedMotionListenerBound = true;
      const onChange = (e: MediaQueryListEvent) => {
        cachedReducedMotion = e.matches;
      };
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', onChange);
      } else if (typeof (mq as any).addListener === 'function') {
        (mq as any).addListener(onChange);
      }
    }
    return cachedReducedMotion;
  }
  return false;
};

export type SpringListener = (value: number, spring: Sp) => void;
export type FrameCallback = () => void;

const activeSprings = new Set<Sp>();
const frameSubscribers = new Set<FrameCallback>();
const cleanupSubscribers = new Set<FrameCallback>();

let rafId = 0;
let prevTime = 0;

export const getActiveSpringCount = (): number => activeSprings.size;
export const isLoopRunning = (): boolean => rafId !== 0;

export const subscribeFrame = (fn: FrameCallback): (() => void) => {
  frameSubscribers.add(fn);
  return () => {
    frameSubscribers.delete(fn);
  };
};

export const subscribeCleanup = (fn: FrameCallback): (() => void) => {
  cleanupSubscribers.add(fn);
  return () => {
    cleanupSubscribers.delete(fn);
  };
};

function notifyFrameSubscribers(): void {
  frameSubscribers.forEach((fn) => fn());
}

function notifyCleanupSubscribers(): void {
  cleanupSubscribers.forEach((fn) => fn());
}

export const frame = (timestamp: number): void => {
  rafId = 0;
  const dt = prevTime ? clamp((timestamp - prevTime) / 16.67, 0, 2.5) : 1;
  prevTime = timestamp;

  const reduced = checkReducedMotion();

  activeSprings.forEach((s) => s.step(dt, reduced));
  notifyFrameSubscribers();
  notifyCleanupSubscribers();

  let allRest = true;
  for (const s of activeSprings) {
    if (!s.rest()) {
      allRest = false;
      break;
    }
  }

  if (allRest) {
    activeSprings.forEach((s) => {
      if (s.x !== s.t || s.v !== 0) {
        s.snap();
      }
    });
    notifyFrameSubscribers();
    notifyCleanupSubscribers();
    prevTime = 0;
  } else {
    rafId = requestAnimationFrame(frame);
  }
};

export const wake = (): void => {
  if (checkReducedMotion()) {
    activeSprings.forEach((s) => {
      if (s.x !== s.t || s.v !== 0) {
        s.snap();
      }
    });
    notifyFrameSubscribers();
    notifyCleanupSubscribers();
    prevTime = 0;
    return;
  }
  if (!rafId && typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    rafId = requestAnimationFrame(frame);
  }
};

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
    const coeff = computeSpringCoefficients(tune);
    this.k = coeff.k;
    this.d = coeff.d;
    activeSprings.add(this);
  }

  get target(): number {
    return this.t;
  }

  set target(val: number) {
    this.setTarget(val);
  }

  step(dt: number, reduced = checkReducedMotion()): void {
    if (this.x === this.t && this.v === 0) return;
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
      this.x = this.t;
      this.v = 0;
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
        notifyFrameSubscribers();
        notifyCleanupSubscribers();
      } else {
        wake();
      }
    }
  }

  subscribe(listener: SpringListener): () => void {
    this.listeners.add(listener);
    listener(this.x, this);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(): void {
    if (this.listeners.size === 0) return;
    this.listeners.forEach((fn) => fn(this.x, this));
  }

  destroy(): void {
    activeSprings.delete(this);
    this.listeners.clear();
  }
}

/**
 * Legacy useSpring hook for isolated non-row widgets.
 * Row lists, detail panel, metrics, and bulk bar MUST use DOM-ref frame subscriptions.
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

export function useSpringCount(target: number, tune = TUNES.metricCountUp): number {
  const val = useSpring(target, tune);
  return Math.round(val);
}

/**
 * Zero-re-render metric count-up hook (tune 20).
 * Writes rounded text directly to the returned element ref inside the shared rAF loop.
 */
export function useSpringCountRef<T extends HTMLElement = HTMLDivElement>(
  target: number,
  options?: {
    tune?: number;
    prefix?: string;
    suffix?: string;
    initialZero?: boolean;
  }
) {
  const elRef = useRef<T | null>(null);
  const tune = options?.tune ?? TUNES.metricCountUp;
  const prefix = options?.prefix ?? '';
  const suffix = options?.suffix ?? '';
  const initialZero = options?.initialZero ?? true;

  const spRef = useRef<Sp | null>(null);
  const lastTextRef = useRef<string>('');
  const lastRoundedRef = useRef<number>(Number.NaN);
  const formatRef = useRef({ prefix, suffix });
  formatRef.current = { prefix, suffix };

  if (!spRef.current) {
    spRef.current = new Sp(initialZero ? 0 : target, tune);
  }

  useEffect(() => {
    const sp = spRef.current!;
    const draw = () => {
      if (!elRef.current) return;
      const rounded = Math.round(sp.x);
      if (rounded === lastRoundedRef.current && lastTextRef.current !== '') return;
      lastRoundedRef.current = rounded;
      const nextText = `${formatRef.current.prefix}${rounded}${formatRef.current.suffix}`;
      if (nextText !== lastTextRef.current) {
        lastTextRef.current = nextText;
        elRef.current.textContent = nextText;
      }
    };
    const unsub = subscribeFrame(draw);
    sp.setTarget(target);
    draw();
    wake();
    return () => {
      unsub();
    };
  }, [target, prefix, suffix]);

  useEffect(() => {
    return () => {
      spRef.current?.destroy();
      spRef.current = null;
    };
  }, []);

  return elRef;
}
