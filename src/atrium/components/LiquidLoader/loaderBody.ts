import { Spring, ZETA } from '../../motion/spring';
import { Body, wake, unschedule } from '../../motion/loop';
import { motion } from '../../motion/env';
import { f } from '../../motion/liquid';
import { clamp, rnd, rr } from '../../motion/shapes';

/* Drawn in a 200-unit box. Four squares rest in the corners of the logo; they melt (surface tension
   wins), swirl around the centre, and re-solidify. The total area never changes. */
const C = 100; // centre
const S = 47.2; // square side at rest
const A = S * S; // area of one square, kept constant while the corners round off
const REST_R = S * 0.147 * 1.0; // the logo's corner radius
const HOME = [
  [S / 2, S / 2],
  [200 - S / 2, S / 2],
  [S / 2, 200 - S / 2],
  [200 - S / 2, 200 - S / 2],
];
const DT = 1 / 240;
const MAX_SUB = 12;
const SOLID = 1.05; // seconds solid
const LIQUID = 2.3; // seconds liquid

export interface LoaderEls {
  host: Element;
  ring: SVGPathElement;
  parts: SVGPathElement;
  blur: SVGFEGaussianBlurElement;
}

export class LoaderBody implements Body {
  visible = true;
  running = true;
  private m = new Spring(0, 16, 0.92); // 0 solid .. 1 liquid
  private ringS = new Spring(1, 240);
  private tim = 0;
  private ph = 0;
  private acc = 0;
  private p = HOME.map((h) => ({ x: h[0], y: h[1], vx: 0, vy: 0 }));

  constructor(readonly els: LoaderEls) {}

  /** a click stirs the liquid: every square is flung away from the pointer */
  stir(x: number, y: number): void {
    for (const p of this.p) {
      const dx = p.x - x;
      const dy = p.y - y;
      const d = Math.max(14, Math.hypot(dx, dy));
      p.vx += (dx / d) * 260 + rnd(-60, 60);
      p.vy += (dy / d) * 260 + rnd(-60, 60);
    }
    if (!motion.reduced) this.ringS.v -= 2.4;
    wake(this);
  }

  private get live(): boolean {
    return this.running && !motion.reduced;
  }

  wakeUp(): void {
    wake(this);
  }

  start(): void {
    this.running = true;
    wake(this);
  }
  stop(): void {
    this.running = false;
    wake(this);
  }
  dispose(): void {
    unschedule(this);
  }

  step(dt: number): void {
    this.acc += dt;
    let n = 0;
    while (this.acc >= DT && n < MAX_SUB) {
      this.sub(DT);
      this.acc -= DT;
      n++;
    }
    if (n === MAX_SUB) this.acc = 0;
  }

  private sub(dt: number): void {
    if (this.live) {
      this.tim += dt;
      if (this.tim > SOLID + LIQUID) this.tim -= SOLID + LIQUID;
    } else this.tim = 0;
    const want = this.live && this.tim >= SOLID ? 1 : 0;
    if (want !== this.ph) {
      this.ph = want;
      if (!motion.reduced) this.ringS.v += want ? -3.2 : 4.2;
    }
    this.m.t = want;
    this.m.step(dt);
    this.ringS.step(dt);
    const mm = clamp(this.m.x, 0, 1);
    const kh = (1 - mm) * 640;
    const kc = mm * 40;
    const sw = mm * mm * 1000;
    const cdr = (1 - mm) * 2 * motion.zeta(ZETA) * Math.sqrt(640) + mm * 5;
    for (let j = 0; j < 4; j++) {
      const p = this.p[j];
      const rx = p.x - C;
      const ry = p.y - C;
      const dist = Math.max(0.001, Math.hypot(rx, ry));
      const ax = kh * (HOME[j][0] - p.x) + kc * (C - p.x) - (ry / dist) * sw - cdr * p.vx;
      const ay = kh * (HOME[j][1] - p.y) + kc * (C - p.y) + (rx / dist) * sw - cdr * p.vy;
      p.vx += ax * dt;
      p.vy += ay * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  render(): void {
    const mm = clamp(this.m.x, 0, 1);
    const rmax = Math.sqrt(A / Math.PI);
    const r0 = REST_R;
    const r = r0 + (rmax - r0) * mm; // corners round off until each square is a disc
    const a = Math.sqrt(A + (4 - Math.PI) * r * r); // side that keeps the area constant
    let d = '';
    for (const p of this.p) d += rr(p.x - a / 2, p.y - a / 2, a, a, r);
    this.els.parts.setAttribute('d', d);
    this.els.blur.setAttribute('stdDeviation', f(0.01 + 6.2 * mm * mm));
    const s = Math.max(0, this.ringS.x);
    const o = ((200 * 0.528) / 2) * s;
    const i = ((200 * 0.346) / 2) * s;
    this.els.ring.setAttribute(
      'd',
      rr(C - o, C - o, o * 2, o * 2, 200 * 0.0555 * s) + `M${f(C - i)} ${f(C - i)}h${f(i * 2)}v${f(i * 2)}h${f(-i * 2)}Z`,
    );
  }

  /** a running loader never rests; a stopped one rests when solid and still */
  settled(): boolean {
    if (this.live) return false;
    return this.m.calm() && this.ringS.calm() && this.p.every((p, j) => Math.hypot(p.vx, p.vy) < 0.5 && Math.hypot(p.x - HOME[j][0], p.y - HOME[j][1]) < 0.2);
  }

  snap(): void {
    this.m.t = 0;
    this.m.snap();
    this.ringS.snap();
    this.acc = 0;
    // the squares go home; the melt is only meaningful while the loop is stepping
    for (let j = 0; j < 4; j++) {
      const p = this.p[j];
      p.x = HOME[j][0];
      p.y = HOME[j][1];
      p.vx = p.vy = 0;
    }
    this.m.x = 0;
  }

  isVisible(): boolean {
    return this.visible && this.els.host.isConnected;
  }
}
