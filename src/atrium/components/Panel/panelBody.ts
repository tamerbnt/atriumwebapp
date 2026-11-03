import { Spring } from '../../motion/spring';
import { Body, wake, unschedule } from '../../motion/loop';
import { f } from '../../motion/liquid';
import type { Side } from './position';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * A floating panel that fills like a vessel, and one blob that follows the pointer between rows.
 *
 *  - level `lv` (0 → 1) is a soft spring; it overshoots slightly, which sloshes the panel past its
 *    full height for a moment (scaleY) before it settles.
 *  - the hover blob is three springs: position, height and opacity. Its height grows with its own
 *    speed, so it stretches while it travels between distant rows.
 *
 * Closed and settled, the body calls `onClosed` so React can unmount the panel.
 */
export class PanelBody implements Body {
  open = false;
  side: Side = 'down';
  lv = new Spring(0, 90);
  hy = new Spring(0, 420, 0.55);
  hh = new Spring(0, 300, 0.7);
  ho = new Spring(0, 300, 1);
  /** [top, height] of the hovered row, or null */
  hover: [number, number] | null = null;
  H = 0;
  R = 8;

  constructor(
    readonly panel: HTMLElement,
    readonly hl: HTMLElement,
    readonly chev: HTMLElement | null,
    readonly onClosed: () => void,
  ) {}

  measure(): void {
    this.H = this.panel.offsetHeight;
    this.R = parseFloat(getComputedStyle(this.panel).borderTopLeftRadius) || 8;
  }

  setOpen(v: boolean): void {
    if (this.open === v) return;
    this.open = v;
    if (v) {
      this.measure();
      // make it focusable at once; the clip-path keeps it invisible until the first frames
      this.render();
    } else {
      this.hover = null;
    }
    wake(this);
  }

  setHover(row: [number, number] | null): void {
    if (row && (!this.hover || this.ho.x < 0.05)) {
      // blob appears in place instead of flying in from wherever it last was
      this.hy.x = row[0];
      this.hy.v = 0;
      this.hh.x = row[1];
      this.hh.v = 0;
    }
    this.hover = row;
    wake(this);
  }

  private aim(): void {
    this.lv.t = this.open ? 1 : 0;
    if (this.hover) {
      this.hy.t = this.hover[0];
      this.hh.t = this.hover[1];
    }
    this.ho.t = this.open && this.hover ? 1 : 0;
  }

  step(dt: number): void {
    this.aim();
    this.lv.step(dt);
    this.hy.step(dt);
    this.hh.step(dt);
    this.ho.step(dt);
  }

  render(): void {
    const lv = this.lv.x;
    const p = this.panel.style;
    if (lv < 0.003 && !this.open) {
      p.visibility = 'hidden';
      if (this.chev) this.chev.style.transform = '';
      return;
    }
    p.visibility = 'visible';
    const hide = Math.max(0, this.H * (1 - lv));
    p.clipPath =
      this.side === 'down'
        ? `inset(0 0 ${f(hide)}px 0 round ${f(this.R)}px)`
        : `inset(${f(hide)}px 0 0 0 round ${f(this.R)}px)`;
    p.transform = lv > 1 ? `scaleY(${f(1 + (lv - 1) * 0.5)})` : '';
    const h = this.hl.style;
    h.opacity = f(clamp(this.ho.x, 0, 1));
    h.height = `${f(Math.max(0, this.hh.x) + clamp(Math.abs(this.hy.v) * 0.03, 0, 10))}px`;
    h.transform = `translateY(${f(this.hy.x - clamp(Math.abs(this.hy.v) * 0.015, 0, 5))}px)`;
    if (this.chev) this.chev.style.transform = `rotate(${f(clamp(lv, 0, 1.2) * 180)}deg)`;
  }

  settled(): boolean {
    return this.lv.calm() && this.hy.calm() && this.hh.calm() && this.ho.calm();
  }

  snap(): void {
    this.aim();
    this.lv.snap();
    this.hy.snap();
    this.hh.snap();
    this.ho.snap();
  }

  isVisible(): boolean {
    return this.panel.isConnected;
  }

  onSleep(): void {
    if (!this.open) this.onClosed();
  }

  dispose(): void {
    unschedule(this);
  }
}
