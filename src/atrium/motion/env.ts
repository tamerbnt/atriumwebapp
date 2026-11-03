/**
 * Motion environment
 * ------------------
 * Two things decide how much an Atrium control is allowed to move:
 *
 *  1. The user's `prefers-reduced-motion` setting.
 *  2. The performance tier, picked automatically from measured frame times
 *     (see loop.ts) or pinned by the app with `configureMotion`.
 *
 * Tiers
 *   full  springs with the brand damping (ζ = 1/φ), one soft overshoot
 *   lite  springs critically damped (ζ = 1): same motion, no overshoot, cheaper to settle
 *   off   nothing animates; controls jump to their target and CSS :hover/:active
 *         styles carry the feedback (see Button.module.css)
 *
 * Everything in this file is safe to import on the server.
 */

export type MotionTier = 'full' | 'lite' | 'off';

type Listener = () => void;

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

const state = {
  reduced: false,
  tier: 'full' as MotionTier,
  /** the governor in loop.ts may lower the tier when frames are slow */
  auto: true,
  respectReduced: true,
};

const listeners = new Set<Listener>();
let inited = false;

function publish(): void {
  if (isBrowser) document.documentElement.setAttribute('data-atr-motion', state.tier);
  listeners.forEach((l) => l());
}

/** Idempotent. Called lazily by the loop and by components after mount. */
export function initMotionEnv(): void {
  if (inited || !isBrowser) return;
  inited = true;

  const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  if (mq) {
    state.reduced = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      state.reduced = e.matches;
      publish();
    };
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
    else if (typeof mq.addListener === 'function') mq.addListener(onChange);
  }

  // Chrome-only hint. A device reporting <= 2 GB starts on the lite tier.
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === 'number' && mem <= 2 && state.tier === 'full') state.tier = 'lite';

  if (state.tier !== 'full') publish();
}

export const motion = {
  /** true when the user asked the OS for reduced motion (and the app respects it) */
  get reduced(): boolean {
    initMotionEnv();
    return state.respectReduced && state.reduced;
  },
  get tier(): MotionTier {
    return state.tier;
  },
  /** tier "off": jump to targets, no simulation */
  get instant(): boolean {
    return state.tier === 'off';
  },
  /** Damping ratio to use for a spring whose designed ratio is `base`. */
  zeta(base: number): number {
    return motion.reduced || state.tier !== 'full' ? 1 : base;
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export interface MotionConfig {
  /** 'auto' (default): start at full and let the frame-time governor lower it. Or pin a tier. */
  tier?: MotionTier | 'auto';
  /** default true. Set false only if your product has its own motion setting. */
  respectReducedMotion?: boolean;
}

/** Call once, e.g. in a client provider, if the defaults don't suit the app. */
export function configureMotion(cfg: MotionConfig): void {
  initMotionEnv();
  if (cfg.respectReducedMotion !== undefined) state.respectReduced = cfg.respectReducedMotion;
  if (cfg.tier !== undefined) {
    if (cfg.tier === 'auto') {
      state.auto = true;
      state.tier = 'full';
    } else {
      state.auto = false;
      state.tier = cfg.tier;
    }
  }
  publish();
}

/** Used by the governor. Returns the new tier, or the same one if it may not / cannot go lower. */
export function downgradeTier(): MotionTier {
  if (!state.auto) return state.tier;
  if (state.tier === 'full') state.tier = 'lite';
  else if (state.tier === 'lite') state.tier = 'off';
  else return state.tier;
  publish();
  return state.tier;
}

/** test helper */
export function __resetMotionEnvForTests(): void {
  state.reduced = false;
  state.tier = 'full';
  state.auto = true;
  state.respectReduced = true;
  listeners.clear();
}
