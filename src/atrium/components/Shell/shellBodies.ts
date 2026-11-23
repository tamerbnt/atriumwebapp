import { Spring } from '../../motion/spring';
import { Body, wake, unschedule } from '../../motion/loop';
import { motion } from '../../motion/env';

const f3 = (n: number): string => (Math.round(n * 1000) / 1000).toString();

/**
 * Sidebar: one spring, `open` (0 = rail, 1 = expanded, ~1.085 at the overshoot).
 * The only per-frame write is the custom property `--open` on the sidebar root. CSS derives
 * everything else from it (the panel's clip-path, the active pill, label fade and slide, the edge
 * button), so nothing here touches layout: the panel is an overlay, icons never move, and the page
 * behind it never reflows.
 */
export class SidebarBody implements Body {
  private open: Spring;
  target: number;
  constructor(readonly root: HTMLElement, initial: boolean) {
    this.target = initial ? 1 : 0;
    this.open = new Spring(this.target, 280);
  }
  setOpen(v: boolean): void {
    this.target = v ? 1 : 0;
    if (motion.reduced || motion.instant) {
      this.snap();
      this.render();
      this.root.removeAttribute('data-sb-moving');
    } else {
      this.root.setAttribute('data-sb-moving', '');
      wake(this);
    }
  }
  onWake(): void {
    this.root.setAttribute('data-sb-moving', '');
  }
  onSleep(): void {
    this.root.removeAttribute('data-sb-moving');
  }
  step(dt: number): void {
    this.open.t = this.target;
    this.open.step(dt);
  }
  render(): void {
    this.root.style.setProperty('--open', f3(this.open.x));
  }
  settled(): boolean {
    this.open.t = this.target;
    return this.open.calm(0.002, 0.01);
  }
  snap(): void {
    this.open.t = this.target;
    this.open.snap();
  }
  isVisible(): boolean {
    return this.root.isConnected;
  }
  dispose(): void {
    this.root.removeAttribute('data-sb-moving');
    unschedule(this);
  }
}

/**
 * Top bar: one spring, `p` (0 = shown, 1 = hidden).
 *
 * The bar slides by `translateY(-p·H)`. The page card follows with a transform too, so a frame costs
 * two compositor-friendly writes and no layout. The real layout flips once, when the toggle happens
 * (the grid row gets 0 or auto height); the card's transform cancels that jump:
 *
 *   visual top of the card = (1 − p)·H   in both layouts
 *   → hidden layout: translateY = (1 − p)·H      shown layout: translateY = −p·H
 */
export class BarBody implements Body {
  private p: Spring;
  hidden: boolean;
  H = 64;
  constructor(readonly bar: HTMLElement, readonly main: HTMLElement, readonly root: HTMLElement, hidden: boolean) {
    this.hidden = hidden;
    this.p = new Spring(hidden ? 1 : 0, 280);
  }
  /** Set before React re-renders the layout, so the transform cancels the jump from frame 0. */
  setHidden(v: boolean): void {
    this.hidden = v;
    if (motion.reduced || motion.instant) {
      this.snap();
      this.render();
      this.root.setAttribute('data-settled', '');
    } else {
      this.root.removeAttribute('data-settled');
      wake(this);
    }
  }
  /** true while the bar is still travelling */
  get moving(): boolean {
    return !this.p.calm(0.002, 0.01) || this.p.t !== (this.hidden ? 1 : 0);
  }
  step(dt: number): void {
    this.p.t = this.hidden ? 1 : 0;
    this.p.step(dt);
  }
  render(): void {
    const p = this.p.x;
    const H = this.H;
    this.bar.style.transform = `translate3d(0,${f3(-p * H)}px,0)`;
    this.main.style.transform = `translate3d(0,${f3(this.hidden ? (1 - p) * H : -p * H)}px,0)`;
  }
  settled(): boolean {
    this.p.t = this.hidden ? 1 : 0;
    return this.p.calm(0.002, 0.01);
  }
  snap(): void {
    this.p.t = this.hidden ? 1 : 0;
    this.p.snap();
  }
  isVisible(): boolean {
    return this.root.isConnected;
  }
  onSleep(): void {
    // at rest: drop the transform entirely so the card is a plain layout box again
    this.main.style.transform = '';
    this.bar.style.transform = this.hidden ? `translate3d(0,${f3(-this.H)}px,0)` : '';
    this.root.setAttribute('data-settled', '');
  }
  dispose(): void {
    unschedule(this);
  }
}

/**
 * AppShell Push transition: one spring, `p` (0 = rail, 1 = expanded).
 *
 * Moving the content area (topbar + main card) to the right when the sidebar expands
 * uses a single-commit FLIP compositor transform:
 * 1. The grid column layout flips once (column 1 becomes 236px vs 60px).
 * 2. On frame 0 before paint, an inverted translate3d cancels the visual jump.
 * 3. The spring glides translate3d to 0 on the GPU compositor thread (0 per-frame layout work).
 * 4. At rest, transforms are stripped (0 frames at rest).
 */
export class PushBody implements Body {
  private p: Spring;
  target: number;
  W = 176;
  isRtl = false;

  constructor(readonly content: HTMLElement, readonly root: HTMLElement, initial: boolean) {
    this.target = initial ? 1 : 0;
    this.p = new Spring(this.target, 280);
  }

  measure(): void {
    const cs = getComputedStyle(this.root);
    const wr = parseFloat(cs.getPropertyValue('--atr-rail')) || 68;
    const wx = parseFloat(cs.getPropertyValue('--atr-rail-open')) || 244;
    this.W = Math.max(0, wx - wr);
    this.isRtl = cs.direction === 'rtl';
  }

  setOpen(v: boolean): void {
    this.target = v ? 1 : 0;
    this.measure();
    if (motion.reduced || motion.instant) {
      this.snap();
      this.render();
      this.root.setAttribute('data-push-settled', '');
    } else {
      this.root.removeAttribute('data-push-settled');
      wake(this);
    }
  }

  get moving(): boolean {
    return !this.p.calm(0.002, 0.01) || this.p.t !== this.target;
  }

  step(dt: number): void {
    this.p.t = this.target;
    this.p.step(dt);
  }

  render(): void {
    const p = this.p.x;
    const dir = this.isRtl ? -1 : 1;
    // When expanding (target=1): at p=0, transform is -W*dir; at p=1, transform is 0
    // When collapsing (target=0): at p=1, transform is W*dir; at p=0, transform is 0
    const tx = this.target === 1 ? (p - 1) * this.W * dir : p * this.W * dir;
    this.content.style.transform = `translate3d(${f3(tx)}px,0,0)`;
  }

  settled(): boolean {
    this.p.t = this.target;
    return this.p.calm(0.002, 0.01);
  }

  snap(): void {
    this.p.t = this.target;
    this.p.snap();
  }

  isVisible(): boolean {
    return this.root.isConnected;
  }

  onSleep(): void {
    this.content.style.transform = '';
    this.root.setAttribute('data-push-settled', '');
  }

  dispose(): void {
    unschedule(this);
  }
}

/**
 * Sidebar hover pill: three springs (position, height/stretch, and opacity).
 *
 * Smoothly tracks the pointer between sidebar items with velocity stretch,
 * identical to the Atrium profile menu liquid panel physics.
 * Directly writes to the DOM node's transform, height, and opacity so moving
 * the pointer causes 0 React re-renders.
 */
export class SidebarHoverBody implements Body {
  hy = new Spring(0, 420, 0.55);
  hh = new Spring(44, 300, 0.7);
  ho = new Spring(0, 300, 1);
  hover: [number, number] | null = null;

  constructor(readonly hl: HTMLElement) {}

  setHover(row: [number, number] | null): void {
    if (row && (!this.hover || this.ho.x < 0.05)) {
      this.hy.x = row[0];
      this.hy.v = 0;
      this.hh.x = row[1];
      this.hh.v = 0;
    }
    this.hover = row;
    wake(this);
  }

  private aim(): void {
    if (this.hover) {
      this.hy.t = this.hover[0];
      this.hh.t = this.hover[1];
    }
    this.ho.t = this.hover ? 1 : 0;
  }

  step(dt: number): void {
    this.aim();
    this.hy.step(dt);
    this.hh.step(dt);
    this.ho.step(dt);
  }

  onWake(): void {
    this.hl.style.willChange = 'transform, opacity';
  }

  render(): void {
    const s = this.hl.style;
    const op = Math.max(0, Math.min(1, this.ho.x));
    s.opacity = f3(op);
    if (op < 0.005) {
      s.visibility = 'hidden';
      return;
    }
    s.visibility = 'visible';
    const baseH = this.hl.offsetHeight || 44;
    const stretch = Math.min(10, Math.abs(this.hy.v) * 0.03);
    const h = Math.max(20, this.hh.x) + stretch;
    const y = this.hy.x - stretch * 0.5;
    const scaleY = h / baseH;
    s.transform = `translate3d(0,${f3(y)}px,0) scaleY(${f3(scaleY)})`;
  }

  settled(): boolean {
    return this.hy.calm(0.002, 0.01) && this.hh.calm(0.002, 0.01) && this.ho.calm(0.002, 0.01);
  }

  snap(): void {
    this.aim();
    this.hy.snap();
    this.hh.snap();
    this.ho.snap();
  }

  isVisible(): boolean {
    return this.hl.isConnected;
  }

  onSleep(): void {
    this.hl.style.willChange = '';
    if (!this.hover) {
      this.hl.style.opacity = '0';
      this.hl.style.visibility = 'hidden';
      this.hl.style.transform = '';
    }
  }

  dispose(): void {
    this.hl.style.willChange = '';
    unschedule(this);
  }
}

/**
 * Sidebar active pill: dual-spring vertical liquid blob matching SegBody.
 *
 * One terracotta capsule whose top (T) and bottom (B) edges are two separate analytical springs.
 * The leading edge moves with stiffness k = 420 while the trailing edge follows with k = 200
 * (damping ζ = 1/φ ≈ 0.618), stretching like a drop of liquid as it glides between nav items,
 * with zero React re-renders and zero per-frame layout reads.
 */
export class SidebarActiveBody implements Body {
  T = new Spring(0, 480);
  B = new Spring(44, 700);
  geo: Array<[number, number]> = [];
  index = -1;
  private baseH = 44;
  private lastTransform = '';
  private lastOpacity = '';

  constructor(
    readonly list: HTMLElement,
    readonly blob: HTMLElement,
    private opts: HTMLElement[],
  ) {}

  setOptions(opts: HTMLElement[]): void {
    this.opts = opts;
  }

  /** Read row geometry once on mount, resize, or item list changes — never per frame. */
  measure(): void {
    const hasGBCR = typeof this.list?.getBoundingClientRect === 'function';
    const listRect = hasGBCR ? this.list.getBoundingClientRect() : null;
    const scrollTop = this.list?.scrollTop || 0;

    this.geo = this.opts.map((o) => {
      if (listRect && typeof o.getBoundingClientRect === 'function') {
        const oRect = o.getBoundingClientRect();
        const top = oRect.top - listRect.top + scrollTop;
        const height = o.offsetHeight || oRect.height || 44;
        return [top, top + height];
      }
      const top =
        o.offsetParent === this.list
          ? o.offsetTop
          : (o.parentElement ? o.parentElement.offsetTop : 0) + o.offsetTop;
      const height = o.offsetHeight || 44;
      return [top, top + height];
    });

    const measuredBlobH = this.blob?.offsetHeight || 0;
    const firstH = this.geo[0] ? this.geo[0][1] - this.geo[0][0] : 0;
    this.baseH = measuredBlobH > 0 ? measuredBlobH : firstH > 0 ? firstH : 44;
  }

  private aim(): void {
    const g = this.geo[this.index];
    if (!g) return;
    this.T.t = g[0];
    this.B.t = g[1];
  }

  /** Slide the liquid capsule to option j. With animate=false it snaps immediately. */
  setIndex(j: number, animate: boolean): void {
    if (j < 0 || j >= this.geo.length) {
      this.index = -1;
      this.setOpacity('0');
      unschedule(this);
      return;
    }

    const hadValidIndex = this.index >= 0 && this.index < this.geo.length;
    if (animate && hadValidIndex && j === this.index) return;

    const down = j > this.index;
    const shouldAnimate = animate && hadValidIndex && !motion.reduced && !motion.instant;

    if (shouldAnimate) {
      this.B.k = down ? 700 : 480;
      this.T.k = down ? 480 : 700;
    }

    this.index = j;
    this.setOpacity('1');

    if (shouldAnimate) {
      this.aim();
      wake(this);
    } else {
      this.snap();
      this.render();
    }
  }

  private setOpacity(op: string): void {
    if (op !== this.lastOpacity) {
      this.blob.style.opacity = op;
      this.lastOpacity = op;
    }
  }

  step(dt: number): void {
    this.aim();
    this.T.step(dt);
    this.B.step(dt);

    // Liquid surface tension cohesion clamp:
    // Caps maximum liquid elongation to 58px (44px + 14px maximum stretch).
    const maxSpan = 58;
    if (this.B.x - this.T.x > maxSpan) {
      if (this.B.k > this.T.k) {
        this.T.x = this.B.x - maxSpan;
        if (this.T.v < this.B.v) this.T.v = this.B.v * 0.9;
      } else {
        this.B.x = this.T.x + maxSpan;
        if (this.B.v > this.T.v) this.B.v = this.T.v * 0.9;
      }
    }
  }

  render(): void {
    if (this.index < 0 || !this.geo.length) {
      this.setOpacity('0');
      return;
    }
    this.setOpacity('1');

    const top = Math.min(this.T.x, this.B.x);
    const bottom = Math.max(this.T.x, this.B.x);
    const height = Math.max(24, bottom - top);
    const scaleY = height / this.baseH;

    const transform =
      Math.abs(scaleY - 1) < 0.001
        ? `translate3d(0,${f3(top)}px,0)`
        : `translate3d(0,${f3(top)}px,0) scaleY(${f3(scaleY)})`;
    if (transform !== this.lastTransform) {
      this.blob.style.transform = transform;
      this.lastTransform = transform;
    }
  }

  settled(): boolean {
    if (this.index < 0) return true;
    this.aim();
    return this.T.calm(0.05, 0.25) && this.B.calm(0.05, 0.25);
  }

  snap(): void {
    this.aim();
    this.T.snap();
    this.B.snap();
  }

  onWake(): void {
    this.blob.style.willChange = 'transform';
  }

  onSleep(): void {
    this.blob.style.willChange = '';
  }

  isVisible(): boolean {
    return this.list.isConnected;
  }

  dispose(): void {
    this.blob.style.willChange = '';
    unschedule(this);
  }
}
