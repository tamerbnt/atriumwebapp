import { Spring } from '../../motion/spring';
import { Body, wake, unschedule } from '../../motion/loop';
import { f } from '../../motion/liquid';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* All positions are in units of the tube's height H, so the switch is the same shape at any size.
   The tube is 2H wide. The pool is a liquid slug between L and R; it is half the tube wide and
   overhangs the end it rests against. */
const OFF_L = -0.19;
const OFF_R = 1;
const ON_L = 1;
const ON_R = 2.19;
const HALF = 0.595; // half the pool's width while dragging
const KNOB = 1 / 6; // knob radius

/**
 * A tilted tube of liquid. The pool runs to the low side with a stretchy leading edge (its two ends
 * are two springs with different stiffness), the knob rides in the middle of the pool and stretches
 * with the pool's speed, and the whole tube leans into the move on a loose spring.
 */
export class ToggleBody implements Body {
  on: boolean;
  press = false;
  /** pointer position in tube heights while dragging, or null */
  drag: number | null = null;
  H = 28;

  L: Spring;
  R = new Spring(OFF_R, 420);
  rot = new Spring(0, 140, 0.5);
  sc = new Spring(1, 360);

  constructor(
    readonly root: HTMLElement,
    readonly track: HTMLElement,
    readonly pool: HTMLElement,
    readonly knob: HTMLElement,
    on: boolean,
  ) {
    this.on = on;
    this.L = new Spring(on ? ON_L : OFF_L, 200);
    this.R = new Spring(on ? ON_R : OFF_R, 420);
  }

  measure(): void {
    this.H = this.track.offsetHeight || 1;
  }

  private aim(): void {
    if (this.drag !== null) {
      const c = clamp(this.drag, 0.405, 1.595);
      this.L.t = c - HALF;
      this.R.t = c + HALF;
    } else {
      this.L.t = this.on ? ON_L : OFF_L;
      this.R.t = this.on ? ON_R : OFF_R;
    }
    this.sc.t = this.press ? 0.97 : 1;
    this.rot.t = 0;
  }

  /** Change the state. The tube gets a small tilt kick in the direction of travel. */
  setOn(v: boolean): void {
    if (v === this.on) return;
    this.on = v;
    this.rot.kick(v ? 60 : -60);
    wake(this);
  }

  step(dt: number): void {
    this.aim();
    this.L.step(dt);
    this.R.step(dt);
    this.rot.step(dt);
    this.sc.step(dt);
  }

  render(): void {
    const H = this.H;
    this.track.style.transform = `rotate(${f(this.rot.x)}deg) scale(${f(this.sc.x)})`;
    const left = clamp(this.L.x, 0, 2) * H;
    const right = clamp(2 - this.R.x, 0, 2) * H;
    this.pool.style.clipPath = `inset(0 ${f(right)}px 0 ${f(left)}px round ${f(H / 2)}px)`;
    // the knob is a drop: it elongates along its direction of travel
    const e = 1 + clamp(Math.abs(this.R.v) * 0.336, 0, 0.5);
    const cx = ((this.L.x + this.R.x) / 2) * H;
    this.knob.style.transform = `translate(${f(cx - KNOB * H)}px,0) scale(${f(e)},${f(1 / e)})`;
  }

  settled(): boolean {
    // a held press or a paused drag is a steady state too: no need to keep stepping
    return this.L.calm() && this.R.calm() && this.rot.calm() && this.sc.calm();
  }

  snap(): void {
    this.aim();
    this.L.snap();
    this.R.snap();
    this.rot.snap();
    this.sc.snap();
  }

  isVisible(): boolean {
    return this.root.isConnected;
  }

  dispose(): void {
    unschedule(this);
  }
}
