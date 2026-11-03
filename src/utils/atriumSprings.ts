// Atrium Live Controls — Damped Harmonic Spring Engine & Kinetic Physics Controllers
// 100% behavioral parity with Atrium Live Controls specification

export type MotionTier = 'full' | 'lite' | 'off';

interface FrameScheduler {
  request: (cb: FrameRequestCallback) => number;
  cancel: (handle: number) => void;
}

export interface SpringBody {
  step: (dt: number) => void;
  render: () => void;
  settled: () => boolean;
  snap: () => void;
  onWake?: () => void;
  onSleep?: () => void;
  isVisible?: () => boolean;
}

const isClient = typeof window !== 'undefined' && typeof document !== 'undefined';

// Golden ratio conjugate
const PHI_INV = (Math.sqrt(5) - 1) / 2; // ~0.6180339887

class MotionSettings {
  reduced = false;
  tier: MotionTier = 'full';
  auto = true;
  respectReduced = true;
  private listeners = new Set<() => void>();
  private initialized = false;

  constructor() {
    if (isClient) {
      this.init();
    }
  }

  private init() {
    if (this.initialized || !isClient) return;
    this.initialized = true;

    if (typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reduced = mq.matches;
      const onChange = (e: MediaQueryListEvent) => {
        this.reduced = e.matches;
        this.notify();
      };
      if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', onChange);
      } else if (typeof mq.addListener === 'function') {
        (mq as any).addListener(onChange);
      }
    }

    const mem = (navigator as any).deviceMemory;
    if (typeof mem === 'number' && mem <= 2 && this.tier === 'full') {
      this.tier = 'lite';
    }
    this.notify();
  }

  get isReduced() {
    if (!this.initialized && isClient) this.init();
    return this.respectReduced && this.reduced;
  }

  get isInstant() {
    return this.tier === 'off';
  }

  zeta(z: number): number {
    return this.isReduced || this.tier !== 'full' ? 1 : z;
  }

  stepDown() {
    if (!this.auto) return this.tier;
    if (this.tier === 'full') this.tier = 'lite';
    else if (this.tier === 'lite') this.tier = 'off';
    else return this.tier;
    this.notify();
    return this.tier;
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify() {
    if (isClient) {
      document.documentElement.setAttribute('data-atr-motion', this.tier);
    }
    this.listeners.forEach((fn) => fn());
  }
}

export const Motion = new MotionSettings();

/**
 * Analytical Damped Spring Oscillator
 */
export class Spring {
  k: number;
  z: number;
  v = 0;
  a = 0;
  x: number;
  t: number;

  constructor(initial: number, stiffness: number, damping = PHI_INV) {
    this.k = stiffness;
    this.z = damping;
    this.x = initial;
    this.t = initial;
  }

  step(dt: number) {
    if (dt <= 0) return;
    const l = Math.sqrt(this.k);
    const z = Motion.zeta(this.z);
    const n = this.x - this.t;
    const u = this.v;

    let pos: number;
    let vel: number;

    if (z < 1 - 1e-4) {
      // Underdamped
      const f = l * Math.sqrt(1 - z * z);
      const s = Math.exp(-z * l * dt);
      const c = Math.cos(f * dt);
      const y = Math.sin(f * dt);
      pos = s * (n * c + ((u + z * l * n) / f) * y);
      vel = s * (u * c - ((z * l * u + l * l * n) / f) * y);
    } else if (z <= 1 + 1e-4) {
      // Critically damped
      const f = Math.exp(-l * dt);
      const s = u + l * n;
      pos = f * (n + s * dt);
      vel = f * (u - l * s * dt);
    } else {
      // Overdamped
      const f = Math.sqrt(z * z - 1);
      const s = l * (-z + f);
      const w = l * (-z - f);
      const y = (u - w * n) / (s - w);
      const r = n - y;
      const em1 = Math.exp(s * dt);
      const em2 = Math.exp(w * dt);
      pos = y * em1 + r * em2;
      vel = y * s * em1 + r * w * em2;
    }

    this.x = this.t + pos;
    this.v = vel;
    this.a = -2 * z * l * vel - l * l * pos;
  }

  calm(posTol = 0.003, velTol = 0.02): boolean {
    return Math.abs(this.v) < velTol && Math.abs(this.t - this.x) < posTol;
  }

  snap() {
    this.x = this.t;
    this.v = 0;
    this.a = 0;
  }

  kick(deltaV: number) {
    if (!Motion.isReduced) {
      this.v += deltaV;
    }
  }
}

/**
 * Global Frame Loop & Frame Rate Governor
 */
class AnimationEngine {
  private sched: FrameScheduler;
  private awake = new Set<SpringBody>();
  private handle = 0;
  private last = 0;
  private seen = 0;
  private slow = 0;

  constructor(sched: FrameScheduler) {
    this.sched = sched;
  }

  get isRunning() {
    return this.handle !== 0;
  }

  wake(body: SpringBody) {
    if (!this.awake.has(body)) {
      this.awake.add(body);
      body.onWake?.();
    }
    if (!this.handle) {
      this.last = 0;
      this.handle = this.sched.request(this.frame);
    }
  }

  remove(body: SpringBody) {
    this.awake.delete(body);
    if (this.awake.size === 0) {
      this.idle();
    }
  }

  sleep(body: SpringBody) {
    this.awake.delete(body);
    body.onSleep?.();
  }

  private idle() {
    if (this.handle) {
      this.sched.cancel(this.handle);
      this.handle = 0;
      this.last = 0;
      this.seen = 0;
      this.slow = 0;
    }
  }

  private govern(dt: number) {
    if (dt > 0.25) return; // Ignore large background tab pauses
    this.seen++;
    if (dt > 0.034) this.slow++; // Slower than 30fps
    if (this.seen >= 45) {
      if (this.slow / this.seen >= 0.8) {
        Motion.stepDown();
      }
      this.seen = 0;
      this.slow = 0;
    }
  }

  private frame = (time: number) => {
    this.handle = this.sched.request(this.frame);
    const dt = this.last ? (time - this.last) / 1000 : 1 / 60;
    this.last = time;
    this.govern(dt);

    const clampedDt = Math.min(Math.max(dt, 0), 1 / 20);

    for (const body of this.awake) {
      try {
        if ((body.isVisible && !body.isVisible()) || Motion.isInstant) {
          body.snap();
          body.render();
          this.sleep(body);
          continue;
        }

        body.step(clampedDt);
        body.render();

        if (body.settled()) {
          body.snap();
          body.render();
          this.sleep(body);
        }
      } catch (err) {
        this.awake.delete(body);
        console.error('[Atrium Live Controls] Spring body error:', err);
      }
    }

    if (this.awake.size === 0) {
      this.idle();
    }
  };
}

let globalEngine: AnimationEngine | null = null;

export function getEngine(): AnimationEngine {
  if (!globalEngine) {
    globalEngine = new AnimationEngine({
      request: (cb) => requestAnimationFrame(cb),
      cancel: (h) => cancelAnimationFrame(h),
    });
  }
  return globalEngine;
}

export const wakeBody = (b: SpringBody) => getEngine().wake(b);
export const removeBody = (b: SpringBody) => {
  if (globalEngine) globalEngine.remove(b);
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const fmt = (v: number) => (Math.round(v * 100) / 100).toString();

/**
 * Button Liquid Ripple & Magnetic Press Controller
 */
export class ButtonLiquidController implements SpringBody {
  el: HTMLElement;
  lq: HTMLElement | null;
  hover = false;
  press = false;
  hold = 0;
  H = 34;
  w = 100;
  cov = 2;
  px = 0.5;
  py = 0.5;

  x = new Spring(0.5, 260, 0.8);
  y = new Spring(0.5, 260, 0.8);
  r = new Spring(0, 90, 0.7);
  sx = new Spring(1, 360);
  sy = new Spring(1, 360);
  bx = new Spring(0, 230);
  by = new Spring(0, 230);
  all: Spring[];

  constructor(el: HTMLElement, lq: HTMLElement | null) {
    this.el = el;
    this.lq = lq;
    this.all = [this.x, this.y, this.r, this.sx, this.sy, this.bx, this.by];
  }

  measure() {
    this.H = this.el.offsetHeight || 34;
    this.w = this.el.offsetWidth || 100;
    this.cov = Math.hypot(this.w, this.H) / this.H + 0.2;
  }

  aim() {
    this.r.t = this.hold > 0 ? this.cov : this.press ? 0.9 : this.hover ? 0.55 : 0;
    if (this.hover || this.press) {
      this.x.t = this.px;
      this.y.t = this.py;
    }
    this.sx.t = this.press ? 1.03 : 1;
    this.sy.t = this.press ? 0.945 : 1;
    this.bx.t = this.hover ? clamp((this.px - 0.5) * 0.14, -0.08, 0.08) : 0;
    this.by.t = this.hover ? clamp((this.py - 0.5) * 0.2, -0.06, 0.06) : 0;
  }

  step(dt: number) {
    if (this.hold > 0) this.hold -= dt;
    this.aim();
    for (const s of this.all) s.step(dt);
  }

  render() {
    if (Motion.isInstant) {
      this.el.style.transform = '';
      if (this.lq) this.lq.style.clipPath = '';
      return;
    }
    const e = this.H;
    if (this.lq) {
      this.lq.style.clipPath = `circle(${fmt(Math.max(0, this.r.x) * e)}px at ${fmt(
        this.x.x * this.w
      )}px ${fmt(this.y.x * e)}px)`;
    }
    this.el.style.transform = `translate(${fmt(this.bx.x * e)}px, ${fmt(this.by.x * e)}px) scale(${fmt(
      this.sx.x
    )}, ${fmt(this.sy.x)})`;
  }

  settled(): boolean {
    return this.hold <= 0 && this.all.every((s) => s.calm());
  }

  snap() {
    this.hold = 0;
    this.aim();
    for (const s of this.all) s.snap();
  }

  onWake() {
    this.el.style.willChange = 'transform';
  }

  onSleep() {
    this.el.style.willChange = '';
    if (!Motion.isInstant) this.el.style.transform = '';
  }

  isVisible(): boolean {
    return this.el.isConnected;
  }
}

const buttonControllers = new WeakMap<HTMLElement, ButtonLiquidController>();

export function getButtonController(el: HTMLElement): ButtonLiquidController {
  let c = buttonControllers.get(el);
  if (!c) {
    c = new ButtonLiquidController(el, el.querySelector(':scope > [data-atr-lq]'));
    buttonControllers.set(el, c);
  }
  return c;
}

let isGlobalDelegationActive = false;

export function initGlobalButtonDelegation() {
  if (isGlobalDelegationActive || !isClient) return;
  isGlobalDelegationActive = true;

  let currentBtn: HTMLElement | null = null;
  let pressedController: ButtonLiquidController | null = null;

  const resetCurrent = () => {
    if (!currentBtn) return;
    const c = getButtonController(currentBtn);
    c.hover = false;
    c.press = false;
    wakeBody(c);
    currentBtn = null;
  };

  const getTarget = (e: Event): HTMLElement | null => {
    const t = e.target as HTMLElement | null;
    return t?.closest?.('[data-atr-liquid]') || null;
  };

  const isDisabled = (el: HTMLElement) => {
    return (el as any).disabled === true || el.getAttribute('aria-disabled') === 'true';
  };

  const updateCoords = (e: PointerEvent, c: ButtonLiquidController) => {
    const rect = c.el.getBoundingClientRect();
    c.px = (e.clientX - rect.left) / Math.max(1, rect.width);
    c.py = (e.clientY - rect.top) / Math.max(1, rect.height);
  };

  const onPointerOver = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const btn = getTarget(e);
    if (btn === currentBtn || !btn || isDisabled(btn)) {
      if (!btn && currentBtn) resetCurrent();
      return;
    }
    resetCurrent();
    const c = getButtonController(btn);
    c.measure();
    c.hover = true;
    updateCoords(e, c);
    currentBtn = btn;
    wakeBody(c);
  };

  const onPointerOut = (e: PointerEvent) => {
    if (!currentBtn) return;
    const rel = e.relatedTarget as HTMLElement | null;
    if (rel && currentBtn.contains(rel)) return;
    resetCurrent();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!currentBtn) return;
    const c = getButtonController(currentBtn);
    updateCoords(e, c);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const btn = getTarget(e);
    if (!btn || isDisabled(btn)) return;
    const c = getButtonController(btn);
    c.measure();
    updateCoords(e, c);
    c.press = true;
    pressedController = c;
    wakeBody(c);
  };

  const onPointerUp = () => {
    if (pressedController) {
      pressedController.press = false;
      wakeBody(pressedController);
      pressedController = null;
    }
  };

  const onClick = (e: MouseEvent) => {
    const btn = getTarget(e);
    if (!btn || isDisabled(btn)) return;
    const c = getButtonController(btn);
    c.measure();
    if (e.detail === 0) {
      c.px = 0.5;
      c.py = 0.5;
    } else if (e.clientX || e.clientY) {
      const rect = btn.getBoundingClientRect();
      c.px = (e.clientX - rect.left) / Math.max(1, rect.width);
      c.py = (e.clientY - rect.top) / Math.max(1, rect.height);
    }
    c.x.t = c.px;
    c.y.t = c.py;
    c.hold = 0.28;
    wakeBody(c);
  };

  const opts: AddEventListenerOptions = { passive: true };
  document.addEventListener('pointerover', onPointerOver, opts);
  document.addEventListener('pointerout', onPointerOut, opts);
  document.addEventListener('pointermove', onPointerMove, opts);
  document.addEventListener('pointerdown', onPointerDown, opts);
  document.addEventListener('pointerup', onPointerUp, opts);
  document.addEventListener('pointercancel', onPointerUp, opts);
  document.addEventListener('click', onClick, opts);
}

/**
 * Segmented Control Dual-Spring Blob Controller
 */
export class SegmentedBlobController implements SpringBody {
  group: HTMLElement;
  blob: HTMLElement;
  opts: HTMLElement[];
  L = new Spring(0, 200);
  R = new Spring(0, 420);
  geo: Array<[number, number]> = [];
  W = 0;
  rad = 5;
  index = 0;
  lastClip = '';
  lastColors: string[] = [];

  constructor(group: HTMLElement, blob: HTMLElement, opts: HTMLElement[]) {
    this.group = group;
    this.blob = blob;
    this.opts = opts;
  }

  measure() {
    const leftOffset = parseFloat(getComputedStyle(this.blob).left) || 0;
    this.W = this.blob.offsetWidth || 1;
    const r = this.opts[0] ? parseFloat(getComputedStyle(this.opts[0]).borderTopLeftRadius) : 0;
    this.rad = r || 5;
    this.geo = this.opts.map((o) => [o.offsetLeft - leftOffset, o.offsetLeft - leftOffset + o.offsetWidth]);
  }

  aim() {
    const g = this.geo[this.index];
    if (g) {
      this.L.t = g[0];
      this.R.t = this.W - g[1];
    }
  }

  setIndex(idx: number, animate: boolean) {
    if (animate && idx === this.index) return;
    const advancing = idx > this.index;
    if (animate) {
      this.R.k = advancing ? 420 : 200;
      this.L.k = advancing ? 200 : 420;
    }
    this.index = idx;
    if (animate) {
      this.aim();
      wakeBody(this);
    } else {
      this.snap();
      this.render();
    }
  }

  step(dt: number) {
    this.aim();
    this.L.step(dt);
    this.R.step(dt);
  }

  render() {
    if (!this.geo.length) return;
    const clip = `inset(0 ${fmt(Math.max(0, this.R.x))}px 0 ${fmt(Math.max(0, this.L.x))}px round ${fmt(
      this.rad
    )}px)`;
    if (clip !== this.lastClip) {
      this.blob.style.clipPath = clip;
      this.lastClip = clip;
    }

    const leftEdge = this.L.x;
    const rightEdge = this.W - this.R.x;

    for (let i = 0; i < this.opts.length; i++) {
      const g = this.geo[i];
      const span = g[1] - g[0];
      const cov = span > 0 ? clamp((Math.min(rightEdge, g[1]) - Math.max(leftEdge, g[0])) / span, 0, 1) : 0;
      const color = `color-mix(in srgb, var(--atr-onacc) ${fmt(cov * 100)}%, var(--atr-ink))`;
      if (color !== this.lastColors[i]) {
        this.opts[i].style.color = color;
        this.lastColors[i] = color;
      }
    }
  }

  settled(): boolean {
    return this.L.calm() && this.R.calm();
  }

  snap() {
    this.aim();
    this.L.snap();
    this.R.snap();
  }

  isVisible(): boolean {
    return this.group.isConnected;
  }

  dispose() {
    removeBody(this);
  }
}

/**
 * Dropdown Popover Curtain & Velocity-Stretched Highlight Controller
 */
export class PopoverMenuController implements SpringBody {
  panel: HTMLElement;
  hl: HTMLElement;
  chev: HTMLElement | null;
  onClosed: () => void;
  open = false;
  side: 'down' | 'up' = 'down';

  lv = new Spring(0, 90);
  hy = new Spring(0, 420, 0.55);
  hh = new Spring(0, 300, 0.7);
  ho = new Spring(0, 300, 1.0);
  hover: [number, number] | null = null;
  H = 0;
  R = 8;

  constructor(panel: HTMLElement, hl: HTMLElement, chev: HTMLElement | null, onClosed: () => void) {
    this.panel = panel;
    this.hl = hl;
    this.chev = chev;
    this.onClosed = onClosed;
  }

  measure() {
    this.H = this.panel.offsetHeight;
    this.R = parseFloat(getComputedStyle(this.panel).borderTopLeftRadius) || 8;
  }

  setOpen(open: boolean) {
    if (this.open !== open) {
      this.open = open;
      if (open) {
        this.measure();
        this.render();
      } else {
        this.hover = null;
      }
      wakeBody(this);
    }
  }

  setHover(item: HTMLElement | [number, number] | null) {
    let coords: [number, number] | null = null;
    if (item && 'offsetTop' in item) {
      coords = [(item as HTMLElement).offsetTop, (item as HTMLElement).offsetHeight];
    } else if (Array.isArray(item)) {
      coords = item;
    }
    if (coords && (!this.hover || this.ho.x < 0.05)) {
      this.hy.x = coords[0];
      this.hy.v = 0;
      this.hh.x = coords[1];
      this.hh.v = 0;
    }
    this.hover = coords;
    wakeBody(this);
  }

  aim() {
    this.lv.t = this.open ? 1 : 0;
    if (this.hover) {
      this.hy.t = this.hover[0];
      this.hh.t = this.hover[1];
    }
    this.ho.t = this.open && this.hover ? 1 : 0;
  }

  step(dt: number) {
    this.aim();
    this.lv.step(dt);
    this.hy.step(dt);
    this.hh.step(dt);
    this.ho.step(dt);
  }

  render() {
    const e = this.lv.x;
    const ps = this.panel.style;
    if (e < 0.003 && !this.open) {
      ps.visibility = 'hidden';
      if (this.chev) this.chev.style.transform = '';
      return;
    }
    ps.visibility = 'visible';
    const curtain = Math.max(0, this.H * (1 - e));
    ps.clipPath =
      this.side === 'down'
        ? `inset(0 0 ${fmt(curtain)}px 0 round ${fmt(this.R)}px)`
        : `inset(${fmt(curtain)}px 0 0 0 round ${fmt(this.R)}px)`;
    ps.transform = e > 1 ? `scaleY(${fmt(1 + (e - 1) * 0.5)})` : '';

    const hs = this.hl.style;
    hs.opacity = fmt(clamp(this.ho.x, 0, 1));
    hs.height = `${fmt(Math.max(0, this.hh.x) + clamp(Math.abs(this.hy.v) * 0.03, 0, 10))}px`;
    hs.transform = `translateY(${fmt(this.hy.x - clamp(Math.abs(this.hy.v) * 0.015, 0, 5))}px)`;

    if (this.chev) {
      this.chev.style.transform = `rotate(${fmt(clamp(e, 0, 1.2) * 180)}deg)`;
    }
  }

  settled(): boolean {
    return this.lv.calm() && this.hy.calm() && this.hh.calm() && this.ho.calm();
  }

  snap() {
    this.aim();
    this.lv.snap();
    this.hy.snap();
    this.hh.snap();
    this.ho.snap();
  }

  isVisible(): boolean {
    return this.panel.isConnected;
  }

  onSleep() {
    if (!this.open) {
      this.onClosed();
    }
  }

  dispose() {
    removeBody(this);
  }
}

/**
 * Liquid Switch Controller with Angular Kick and Knob Velocity Squash
 */
export class LiquidSwitchController implements SpringBody {
  root: HTMLElement;
  track: HTMLElement;
  pool: HTMLElement;
  knob: HTMLElement;
  press = false;
  drag: number | null = null;
  H = 28;
  on: boolean;

  L: Spring;
  R: Spring;
  rot = new Spring(0, 140, 0.5);
  sc = new Spring(1, 360);

  constructor(root: HTMLElement, track: HTMLElement, pool: HTMLElement, knob: HTMLElement, on: boolean = false) {
    this.root = root;
    this.track = track;
    this.pool = pool;
    this.knob = knob;
    this.on = on;
    this.L = new Spring(on ? 1 : -0.19, 200);
    this.R = new Spring(on ? 2.19 : 1, 420);
  }

  measure() {
    this.H = this.track.offsetHeight || 28;
  }

  aim() {
    if (this.drag !== null) {
      const e = clamp(this.drag, 0.405, 1.595);
      this.L.t = e - 0.595;
      this.R.t = e + 0.595;
    } else {
      this.L.t = this.on ? 1 : -0.19;
      this.R.t = this.on ? 2.19 : 1;
    }
    this.sc.t = this.press ? 0.97 : 1;
    this.rot.t = 0;
  }

  setChecked(on: boolean, animate = true) {
    if (on !== this.on) {
      this.on = on;
      if (animate) {
        this.rot.kick(on ? 60 : -60);
        wakeBody(this);
      } else {
        this.snap();
        this.render();
      }
    }
  }

  setOn(on: boolean) {
    this.setChecked(on, true);
  }

  dragTo(val: number) {
    this.drag = val;
    wakeBody(this);
  }

  step(dt: number) {
    this.aim();
    this.L.step(dt);
    this.R.step(dt);
    this.rot.step(dt);
    this.sc.step(dt);
  }

  render() {
    const e = this.H;
    this.track.style.transform = `rotate(${fmt(this.rot.x)}deg) scale(${fmt(this.sc.x)})`;

    const left = clamp(this.L.x, 0, 2) * e;
    const right = clamp(2 - this.R.x, 0, 2) * e;
    this.pool.style.clipPath = `inset(0 ${fmt(right)}px 0 ${fmt(left)}px round ${fmt(e / 2)}px)`;

    const squash = 1 + clamp(Math.abs(this.R.v) * 0.336, 0, 0.5);
    const mid = ((this.L.x + this.R.x) / 2) * e;
    this.knob.style.transform = `translate(${fmt(mid - (1 / 6) * e)}px, 0) scale(${fmt(squash)}, ${fmt(
      1 / squash
    )})`;
  }

  settled(): boolean {
    return this.L.calm() && this.R.calm() && this.rot.calm() && this.sc.calm();
  }

  snap() {
    this.aim();
    this.L.snap();
    this.R.snap();
    this.rot.snap();
    this.sc.snap();
  }

  isVisible(): boolean {
    return this.root.isConnected;
  }

  dispose() {
    removeBody(this);
  }
}

/**
 * Micro-Spring Controller for Badge Scale Pop and Icon Rotation Spin
 */
export class MicroSpringController implements SpringBody {
  el: HTMLElement;
  mode: 'scale' | 'rotate';
  s: Spring;

  constructor(el: HTMLElement, mode: 'scale' | 'rotate') {
    this.el = el;
    this.mode = mode;
    this.s = mode === 'scale' ? new Spring(1, 420, 0.35) : new Spring(0, 60, 0.7);
  }

  step(dt: number) {
    this.s.step(dt);
  }

  render() {
    const st = this.el.style;
    st.transform = this.mode === 'scale' ? `scale(${fmt(this.s.x)})` : `rotate(${fmt(this.s.x)}deg)`;
  }

  settled(): boolean {
    return this.s.calm();
  }

  snap() {
    if (this.mode === 'rotate') {
      this.s.t = this.s.t % 360;
    }
    this.s.snap();
  }

  onSleep() {
    if (this.mode === 'scale') {
      this.el.style.transform = '';
    }
  }
}

const microControllers = new WeakMap<HTMLElement, MicroSpringController>();

function getMicroController(el: Element, mode: 'scale' | 'rotate'): MicroSpringController {
  const htmlEl = el as HTMLElement;
  let c = microControllers.get(htmlEl);
  if (!c) {
    c = new MicroSpringController(htmlEl, mode);
    microControllers.set(htmlEl, c);
  }
  return c;
}

/**
 * Pops badge scale on count increment
 */
export function popBadge(el: Element, delta = 14) {
  if (Motion.isReduced) return;
  const c = getMicroController(el, 'scale');
  c.s.v += delta;
  wakeBody(c);
}

/**
 * Rotates an icon 360 degrees on angular spring
 */
export function spinIcon(el: Element, deg = 360) {
  if (Motion.isReduced) return;
  const c = getMicroController(el, 'rotate');
  c.s.t += deg;
  wakeBody(c);
}

/**
 * Popover placement calculator with viewport flip detection
 */
export function calculatePopoverPlacement(
  targetRect: DOMRect,
  panelWidth: number,
  panelHeight: number,
  preferredPlacement: string = 'bottom-end',
  offset = 6,
  viewport: { width: number; height: number } = {
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  },
  padding = 8
): { top: number; left: number; side: 'down' | 'up' } {
  const spaceBelow = viewport.height - targetRect.bottom - offset - padding;
  const spaceAbove = targetRect.top - offset - padding;

  let flipToTop = preferredPlacement.startsWith('top');
  if (!flipToTop && panelHeight > spaceBelow && spaceAbove > spaceBelow) {
    flipToTop = true;
  } else if (flipToTop && panelHeight > spaceAbove && spaceBelow > spaceAbove) {
    flipToTop = false;
  }

  let left = preferredPlacement.endsWith('end') ? targetRect.right - panelWidth : targetRect.left;
  left = Math.min(Math.max(padding, left), Math.max(padding, viewport.width - panelWidth - padding));

  return {
    top: flipToTop ? targetRect.top - offset - panelHeight : targetRect.bottom + offset,
    left,
    side: flipToTop ? 'up' : 'down',
  };
}
