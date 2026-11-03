import { Spring } from '../../motion/spring';
import { Body, wake, unschedule } from '../../motion/loop';
import { f } from '../../motion/liquid';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * The liquid blob behind a segmented control.
 *
 * The blob is one rectangle whose left and right edges are two separate springs.
 * The edge the blob is moving toward is stiffer than the one it leaves behind, so it
 * stretches on the way out and catches up: a drop of liquid sliding between two wells.
 */
export class SegBody implements Body {
  L = new Spring(0, 200);
  R = new Spring(0, 420);
  geo: Array<[number, number]> = [];
  W = 0;
  rad = 6;
  index = 0;
  private lastClip = '';
  private lastColors: string[] = [];

  constructor(
    readonly group: HTMLElement,
    readonly blob: HTMLElement,
    readonly opts: HTMLElement[],
  ) {}

  /** Read geometry. Call on mount, on resize and when fonts load, never per frame. */
  measure(): void {
    const pad = parseFloat(getComputedStyle(this.blob).left) || 0;
    this.W = this.blob.offsetWidth;
    const r = this.opts[0] ? parseFloat(getComputedStyle(this.opts[0]).borderTopLeftRadius) : 0;
    this.rad = r || 6;
    this.geo = this.opts.map((o) => [o.offsetLeft - pad, o.offsetLeft - pad + o.offsetWidth]);
  }

  private aim(): void {
    const g = this.geo[this.index];
    if (!g) return;
    this.L.t = g[0];
    this.R.t = this.W - g[1];
  }

  /** Move to option j. With `animate` false it jumps (initial layout, resize). */
  setIndex(j: number, animate: boolean): void {
    if (animate && j === this.index) return;
    const right = j > this.index;
    if (animate) {
      this.R.k = right ? 420 : 200;
      this.L.k = right ? 200 : 420;
    }
    this.index = j;
    if (animate) {
      this.aim();
      wake(this);
    } else {
      this.snap();
      this.render();
    }
  }

  step(dt: number): void {
    this.aim();
    this.L.step(dt);
    this.R.step(dt);
  }

  render(): void {
    if (!this.geo.length) return;
    const clip = `inset(0 ${f(Math.max(0, this.R.x))}px 0 ${f(Math.max(0, this.L.x))}px round ${f(this.rad)}px)`;
    if (clip !== this.lastClip) {
      this.blob.style.clipPath = clip;
      this.lastClip = clip;
    }
    // each label turns from ink to on-accent exactly as far as the blob has covered it
    const l = this.L.x;
    const r = this.W - this.R.x;
    for (let k = 0; k < this.opts.length; k++) {
      const a = this.geo[k];
      const w = a[1] - a[0];
      const ov = w > 0 ? clamp((Math.min(r, a[1]) - Math.max(l, a[0])) / w, 0, 1) : 0;
      const col = `color-mix(in srgb, var(--atr-onacc) ${f(ov * 100)}%, var(--atr-ink))`;
      if (col !== this.lastColors[k]) {
        this.opts[k].style.color = col;
        this.lastColors[k] = col;
      }
    }
  }

  settled(): boolean {
    return this.L.calm() && this.R.calm();
  }

  snap(): void {
    this.aim();
    this.L.snap();
    this.R.snap();
  }

  isVisible(): boolean {
    return this.group.isConnected;
  }

  dispose(): void {
    unschedule(this);
  }
}
