import { Spring } from './spring';
import { Body, wake } from './loop';
import { motion } from './env';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** two decimals is plenty for CSS and keeps style strings short */
export const f = (n: number): string => (Math.round(n * 100) / 100).toString();

/**
 * The liquid press, shared by every Atrium button.
 *
 * - Hover: a pool of the "liquid" colour grows from the pointer, and the body leans toward it.
 * - Press: the body squashes (wider, shorter) and the pool swells.
 * - Click: the pool floods the whole button from where you clicked, then drains.
 *
 * All sizes are in units of the control's height, so a 24 px and a 44 px control move the same way.
 */
class LiquidBody implements Body {
  hover = false;
  press = false;
  /** seconds the flood is held after a click */
  hold = 0;
  H = 34;
  w = 100;
  /** radius, in heights, needed to cover the whole control from the click point */
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
  private all = [this.x, this.y, this.r, this.sx, this.sy, this.bx, this.by];
  private lastClip = '';
  private lastTf = '';

  constructor(
    readonly el: HTMLElement,
    readonly lq: HTMLElement | null,
  ) {}

  measure(): void {
    this.H = this.el.offsetHeight || 1;
    this.w = this.el.offsetWidth || 1;
    this.cov = Math.hypot(this.w, this.H) / this.H + 0.2;
  }

  private aim(): void {
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

  step(dt: number): void {
    if (this.hold > 0) this.hold -= dt;
    this.aim();
    for (const s of this.all) s.step(dt);
  }

  render(): void {
    if (motion.instant) {
      // tier "off": CSS :hover / :active take over
      if (this.lastTf !== '') {
        this.el.style.transform = '';
        this.lastTf = '';
      }
      if (this.lq && this.lastClip !== '') {
        this.lq.style.clipPath = '';
        this.lastClip = '';
      }
      return;
    }
    const H = this.H;
    if (this.lq) {
      const clip = `circle(${f(Math.max(0, this.r.x) * H)}px at ${f(this.x.x * this.w)}px ${f(this.y.x * H)}px)`;
      if (clip !== this.lastClip) {
        this.lq.style.clipPath = clip;
        this.lastClip = clip;
      }
    }
    const tf = `translate3d(${f(this.bx.x * H)}px,${f(this.by.x * H)}px,0) scale(${f(this.sx.x)},${f(this.sy.x)})`;
    if (tf !== this.lastTf) {
      this.el.style.transform = tf;
      this.lastTf = tf;
    }
  }

  settled(): boolean {
    return this.hold <= 0 && this.all.every((s) => s.calm());
  }

  snap(): void {
    this.hold = 0;
    this.aim();
    for (const s of this.all) s.snap();
  }

  onWake(): void {
    this.el.style.willChange = 'transform';
  }
  onSleep(): void {
    this.el.style.willChange = '';
    // leave no transform behind at rest: it would create a stacking context for nothing
    if (!motion.instant && this.lastTf !== '') {
      this.el.style.transform = '';
      this.lastTf = '';
    }
  }

  isVisible(): boolean {
    return this.el.isConnected;
  }
}

const bodies = new WeakMap<HTMLElement, LiquidBody>();
const SELECTOR = '[data-atr-liquid]';

function bodyFor(el: HTMLElement): LiquidBody {
  let b = bodies.get(el);
  if (!b) {
    b = new LiquidBody(el, el.querySelector<HTMLElement>(':scope > [data-atr-lq]'));
    bodies.set(el, b);
  }
  return b;
}

function find(e: Event): HTMLElement | null {
  const t = e.target as Element | null;
  return t && typeof t.closest === 'function' ? t.closest<HTMLElement>(SELECTOR) : null;
}

function isDisabled(el: HTMLElement): boolean {
  return (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true';
}

function aim(e: PointerEvent, b: LiquidBody): void {
  const r = b.el.getBoundingClientRect();
  b.px = (e.clientX - r.left) / Math.max(1, r.width);
  b.py = (e.clientY - r.top) / Math.max(1, r.height);
}

let installed = false;
let uninstall: (() => void) | null = null;

/**
 * Attach the delegated pointer listeners, once for the whole page.
 * Buttons cost nothing until you first touch them: a body is created lazily on first hover or press.
 * Safe to call from every component; safe on the server (no-op).
 */
export function installLiquid(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  let hovered: HTMLElement | null = null;
  let pressed: LiquidBody | null = null;

  const leave = () => {
    if (!hovered) return;
    const b = bodyFor(hovered);
    b.hover = false;
    b.press = false;
    wake(b);
    hovered = null;
  };

  const onOver = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const el = find(e);
    if (el === hovered) return;
    leave();
    if (!el || isDisabled(el)) return;
    const b = bodyFor(el);
    b.measure();
    b.hover = true;
    aim(e, b);
    hovered = el;
    wake(b);
  };
  const onOut = (e: PointerEvent) => {
    if (!hovered) return;
    const to = e.relatedTarget as Node | null;
    if (to && hovered.contains(to)) return;
    leave();
  };
  const onMove = (e: PointerEvent) => {
    if (!hovered) return;
    const b = bodyFor(hovered);
    aim(e, b);
    wake(b);
  };
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const el = find(e);
    if (!el || isDisabled(el)) return;
    const b = bodyFor(el);
    b.measure();
    aim(e, b);
    b.press = true;
    pressed = b;
    wake(b);
  };
  const onUp = () => {
    if (!pressed) return;
    pressed.press = false;
    wake(pressed);
    pressed = null;
  };
  const onClick = (e: MouseEvent) => {
    const el = find(e);
    if (!el || isDisabled(el)) return;
    const b = bodyFor(el);
    b.measure();
    if (e.detail === 0) {
      // keyboard or programmatic click: flood from the centre
      b.px = 0.5;
      b.py = 0.5;
    } else if (e.clientX || e.clientY) {
      const r = el.getBoundingClientRect();
      b.px = (e.clientX - r.left) / Math.max(1, r.width);
      b.py = (e.clientY - r.top) / Math.max(1, r.height);
    }
    b.x.t = b.px;
    b.y.t = b.py;
    b.hold = 0.28;
    wake(b);
  };

  const d = document;
  const opt = { passive: true } as AddEventListenerOptions;
  d.addEventListener('pointerover', onOver, opt);
  d.addEventListener('pointerout', onOut, opt);
  d.addEventListener('pointermove', onMove, opt);
  d.addEventListener('pointerdown', onDown, opt);
  d.addEventListener('pointerup', onUp, opt);
  d.addEventListener('pointercancel', onUp, opt);
  d.addEventListener('click', onClick, opt);

  uninstall = () => {
    d.removeEventListener('pointerover', onOver);
    d.removeEventListener('pointerout', onOut);
    d.removeEventListener('pointermove', onMove);
    d.removeEventListener('pointerdown', onDown);
    d.removeEventListener('pointerup', onUp);
    d.removeEventListener('pointercancel', onUp);
    d.removeEventListener('click', onClick);
  };
}

/** For tests and hot-reload edge cases. */
export function uninstallLiquid(): void {
  uninstall?.();
  uninstall = null;
  installed = false;
}

/* ------------------------------------------------------------------ icon kicks */

type KickMode = 'scale' | 'rotate';

class KickBody implements Body {
  s: Spring;
  constructor(
    readonly el: Element,
    readonly mode: KickMode,
  ) {
    // a springy pop for badges, a slow free spin for refresh
    this.s = mode === 'scale' ? new Spring(1, 420, 0.35) : new Spring(0, 60, 0.7);
  }
  step(dt: number): void {
    this.s.step(dt);
  }
  render(): void {
    const st = (this.el as HTMLElement).style;
    st.transform = this.mode === 'scale' ? `scale(${f(this.s.x)})` : `rotate(${f(this.s.x)}deg)`;
  }
  settled(): boolean {
    return this.s.calm();
  }
  snap(): void {
    if (this.mode === 'rotate') {
      // a full turn looks like no turn: keep the numbers small
      const t = this.s.t % 360;
      this.s.t = t;
    }
    this.s.snap();
  }
  onSleep(): void {
    if (this.mode === 'scale') (this.el as HTMLElement).style.transform = '';
  }
}

const kicks = new WeakMap<Element, KickBody>();

function kickBody(el: Element, mode: KickMode): KickBody {
  let k = kicks.get(el);
  if (!k) {
    k = new KickBody(el, mode);
    kicks.set(el, k);
  }
  return k;
}

/** A quick pop, e.g. when a badge count goes up. */
export function kickScale(el: Element, velocity = 14): void {
  if (motion.reduced) return;
  const k = kickBody(el, 'scale');
  k.s.v += velocity;
  wake(k);
}

/** One slow turn, e.g. a refresh icon. Each call adds another turn. */
export function kickSpin(el: Element, degrees = 360): void {
  if (motion.reduced) return;
  const k = kickBody(el, 'rotate');
  k.s.t += degrees;
  wake(k);
}
