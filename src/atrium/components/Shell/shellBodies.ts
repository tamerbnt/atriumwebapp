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
    this.open = new Spring(this.target, 150);
  }
  setOpen(v: boolean): void {
    this.target = v ? 1 : 0;
    if (motion.reduced || motion.instant) {
      this.snap();
      this.render();
    } else wake(this);
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
    this.p = new Spring(hidden ? 1 : 0, 140);
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
    this.p = new Spring(this.target, 150);
  }

  measure(): void {
    const cs = getComputedStyle(this.root);
    const wr = parseFloat(cs.getPropertyValue('--atr-rail')) || 60;
    const wx = parseFloat(cs.getPropertyValue('--atr-rail-open')) || 236;
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
  hh = new Spring(40, 300, 0.7);
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

  render(): void {
    const s = this.hl.style;
    const op = Math.max(0, Math.min(1, this.ho.x));
    s.opacity = f3(op);
    if (op < 0.005) {
      s.visibility = 'hidden';
      return;
    }
    s.visibility = 'visible';
    const stretch = Math.min(10, Math.abs(this.hy.v) * 0.03);
    const h = Math.max(20, this.hh.x) + stretch;
    const y = this.hy.x - stretch * 0.5;
    s.height = `${f3(h)}px`;
    s.transform = `translate3d(0,${f3(y)}px,0)`;
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
    if (!this.hover) {
      this.hl.style.opacity = '0';
      this.hl.style.visibility = 'hidden';
      this.hl.style.transform = '';
    }
  }

  dispose(): void {
    unschedule(this);
  }
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * Sidebar active pill: dual-spring vertical liquid blob matching SegBody.
 *
 * One terracotta capsule whose top (T) and bottom (B) edges are two separate analytical springs.
 * The leading edge moves with stiffness k = 420 while the trailing edge follows with k = 200
 * (damping ζ = 1/φ ≈ 0.618), stretching like a drop of liquid as it glides between nav items,
 * with zero React re-renders and zero per-frame layout reads.
 */
export class SidebarActiveBody implements Body {
  T = new Spring(0, 200);
  B = new Spring(40, 420);
  geo: Array<[number, number]> = [];
  index = -1;
  private lastTransform = '';
  private lastHeight = '';
  private lastOpacity = '';
  private lastColors: string[] = [];

  constructor(
    readonly list: HTMLElement,
    readonly blob: HTMLElement,
    private opts: HTMLElement[],
  ) {}

  setOptions(opts: HTMLElement[]): void {
    this.opts = opts;
    this.lastColors = [];
  }

  /** Read row geometry once on mount, resize, or item list changes — never per frame. */
  measure(): void {
    this.geo = this.opts.map((o) => {
      const top =
        o.offsetParent === this.list
          ? o.offsetTop
          : (o.parentElement ? o.parentElement.offsetTop : 0) + o.offsetTop;
      const height = o.offsetHeight || 40;
      return [top, top + height];
    });
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
      this.clearColors();
      this.setOpacity('0');
      unschedule(this);
      return;
    }

    const hadValidIndex = this.index >= 0 && this.index < this.geo.length;
    if (animate && hadValidIndex && j === this.index) return;

    const down = j > this.index;
    const shouldAnimate = animate && hadValidIndex && !motion.reduced && !motion.instant;

    if (shouldAnimate) {
      this.B.k = down ? 420 : 200;
      this.T.k = down ? 200 : 420;
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

  private clearColors(): void {
    for (let k = 0; k < this.opts.length; k++) {
      if (this.lastColors[k] !== '') {
        this.opts[k].style.color = '';
        this.lastColors[k] = '';
      }
    }
  }

  step(dt: number): void {
    this.aim();
    this.T.step(dt);
    this.B.step(dt);
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

    const transform = `translate3d(0,${f3(top)}px,0)`;
    if (transform !== this.lastTransform) {
      this.blob.style.transform = transform;
      this.lastTransform = transform;
    }
    const hStr = `${f3(height)}px`;
    if (hStr !== this.lastHeight) {
      this.blob.style.height = hStr;
      this.lastHeight = hStr;
    }

    for (let k = 0; k < this.opts.length; k++) {
      const g = this.geo[k];
      if (!g) continue;
      const span = g[1] - g[0];
      const ov = span > 0 ? clamp((Math.min(bottom, g[1]) - Math.max(top, g[0])) / span, 0, 1) : 0;
      const pct = Math.round(ov * 50) * 2;
      const col =
        pct <= 0
          ? ''
          : pct >= 100
          ? '#ffffff'
          : `color-mix(in srgb, #ffffff ${pct}%, var(--atr-side-mut))`;
      if (col !== this.lastColors[k]) {
        this.opts[k].style.color = col;
        this.lastColors[k] = col;
      }
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
    this.blob.style.willChange = 'transform, height';
  }

  onSleep(): void {
    this.blob.style.willChange = '';
    this.clearColors();
    if (this.index >= 0 && this.opts[this.index]) {
      this.opts[this.index].style.color = '#ffffff';
      this.lastColors[this.index] = '#ffffff';
    }
  }

  isVisible(): boolean {
    return this.list.isConnected;
  }

  dispose(): void {
    this.clearColors();
    unschedule(this);
  }
}
