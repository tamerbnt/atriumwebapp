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
