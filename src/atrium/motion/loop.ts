import { motion, downgradeTier, initMotionEnv } from './env';

/**
 * One animated thing. Bodies are woken when something happens (hover, click, state change),
 * stepped every frame while they move, and put to sleep the moment they are at rest.
 * An idle screen therefore runs zero frames and costs zero CPU.
 */
export interface Body {
  /** Advance the physics by dt seconds. Must set its own targets first (see `aim` pattern). */
  step(dt: number): void;
  /** Write the current state to the DOM. No layout reads in here. */
  render(): void;
  /** true when every spring is at rest */
  settled(): boolean;
  /** Jump to the target state. Called when settled, when offscreen, and on the `off` tier. */
  snap(): void;
  onWake?(): void;
  onSleep?(): void;
  /** Return false for offscreen elements: the body jumps to rest instead of animating. */
  isVisible?(): boolean;
}

export interface Scheduler {
  request(cb: (time: number) => void): number;
  cancel(handle: number): void;
}

/** Longest step the physics will take. A background tab coming back must not fast-forward. */
const MAX_DT = 1 / 20;
/** Governor: frames slower than this count as "slow" (≈ below 30 fps). */
const SLOW_FRAME = 0.034;
/** Governor: look at this many consecutive active frames at a time. */
const WINDOW = 45;
/** Governor: lower the tier when at least this share of the window was slow. */
const SLOW_SHARE = 0.8;
/** Gaps longer than this are tab switches, not slowness. */
const GAP = 0.25;

export class Loop {
  private awake = new Set<Body>();
  private handle = 0;
  private last = 0;
  private seen = 0;
  private slow = 0;
  /** frames rendered since creation, for diagnostics and tests */
  frames = 0;

  constructor(private sched: Scheduler) {}

  get running(): boolean {
    return this.handle !== 0;
  }
  get size(): number {
    return this.awake.size;
  }

  wake(b: Body): void {
    if (!this.awake.has(b)) {
      this.awake.add(b);
      b.onWake?.();
    }
    if (!this.handle) {
      this.last = 0;
      this.handle = this.sched.request(this.frame);
    }
  }

  /** Remove a body without calling onSleep (used on unmount). */
  remove(b: Body): void {
    this.awake.delete(b);
    if (this.awake.size === 0) this.idle();
  }

  private idle(): void {
    if (this.handle) this.sched.cancel(this.handle);
    this.handle = 0;
    this.last = 0;
    this.seen = 0;
    this.slow = 0;
  }

  private sleep(b: Body): void {
    this.awake.delete(b);
    b.onSleep?.();
  }

  private govern(dt: number): void {
    if (dt > GAP) return;
    this.seen++;
    if (dt > SLOW_FRAME) this.slow++;
    if (this.seen >= WINDOW) {
      if (this.slow / this.seen >= SLOW_SHARE) downgradeTier();
      this.seen = 0;
      this.slow = 0;
    }
  }

  private frame = (now: number): void => {
    this.handle = this.sched.request(this.frame);
    const raw = this.last ? (now - this.last) / 1000 : 1 / 60;
    this.last = now;
    this.frames++;
    this.govern(raw);
    const dt = Math.min(Math.max(raw, 0), MAX_DT);

    for (const b of this.awake) {
      try {
        if ((b.isVisible && !b.isVisible()) || motion.instant) {
          b.snap();
          b.render();
          this.sleep(b);
          continue;
        }
        b.step(dt);
        b.render();
        if (b.settled()) {
          b.snap();
          b.render();
          this.sleep(b);
        }
      } catch (err) {
        // a broken body must never take the whole loop down with it
        this.awake.delete(b);
        // eslint-disable-next-line no-console
        console.error('[atrium] body failed and was removed from the loop', err);
      }
    }
    if (this.awake.size === 0) this.idle();
  };
}

let singleton: Loop | null = null;

export function getLoop(): Loop {
  if (!singleton) {
    initMotionEnv();
    singleton = new Loop({
      request: (cb) => requestAnimationFrame(cb),
      cancel: (h) => cancelAnimationFrame(h),
    });
  }
  return singleton;
}

export const wake = (b: Body): void => getLoop().wake(b);
export const unschedule = (b: Body): void => {
  if (singleton) singleton.remove(b);
};
