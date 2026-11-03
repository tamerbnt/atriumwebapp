import { Spring } from '../../motion/spring';
import { Body, wake, unschedule } from '../../motion/loop';
import { motion } from '../../motion/env';
import { f } from '../../motion/liquid';
import { clamp, rnd, rr, el, metaball } from '../../motion/shapes';
import { WaveField, WAVE_N } from '../../motion/wave';

export type LiquidKind = 'scan' | 'import' | 'export' | 'confirm' | 'continue' | 'create';
export type LiquidStatus = 'idle' | 'busy' | 'done' | 'error';

/* ---------------------------------------------------------------------------------------------
   Geometry. The button is drawn in a space that is always 72 units tall (the design height) and
   W units wide, where W follows the real aspect ratio. CSS scales the whole drawing to --atr-h,
   so a 34 px and a 72 px button are the same object. Nothing below ever reads the layout.
   ------------------------------------------------------------------------------------------- */
export const H = 72;
const R0 = 0.147 * H;
const IC = 44; // the four-squares mark
const IX = 28;
const IY = 14;
const CS = IC * 0.236;
const CR = CS * 0.147;
const RO = IC * 0.528;
const ROR = IC * 0.0555;
const RI = IC * 0.346;
const HOME = [
  [0, 0],
  [IC - CS, 0],
  [0, IC - CS],
  [IC - CS, IC - CS],
];
const DIR = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];
/** waypoints of the check mark, drawn by a pen that has mass */
const PW = [
  [13.5, 22.5],
  [19.5, 28.5],
  [30.5, 15],
];
const DT = 1 / 240; // physics slice
const MAX_SUB = 12; // 12 × 1/240 = the loop's 1/20 s cap
const G = 900; // gravity, units / s²
const M = 15; // nodes of the scan bar (a flexible string)

/** how many events fill the vessel */
const DROPS = 7;
const POURS = 5;

/** seconds each kind stays in `done` before it goes back to idle */
const HOLD: Record<LiquidKind, number> = { scan: 1.5, import: 1.7, export: 1.5, confirm: 1.9, continue: 0, create: 1.7 };
const ERROR_HOLD = 2.4;
/** the shortest the busy phase lasts, so a fast request still shows the motion */
const MIN_BUSY: Record<LiquidKind, number> = { scan: 1.6, import: 0, export: 0, confirm: 0.45, continue: 1.3, create: 0.6 };

export interface LbEls {
  button: HTMLElement;
  svg: SVGSVGElement;
  root: SVGGElement;
  body: SVGRectElement;
  clipr: SVGRectElement;
  maskr: SVGRectElement;
  liq: SVGPathElement;
  lqcp: SVGPathElement;
  air: SVGPathElement;
  mark: SVGPathElement;
  chk: SVGPathElement;
  arw: SVGPathElement;
  /** the four label slots: idle, busy, done, error */
  labs: SVGGElement[];
  texts: SVGTextElement[];
}

export interface LbOptions {
  /** ms to stay in done/error before returning to idle. Infinity: stay until told otherwise. */
  holdMs?: number;
  /** idle life: the corners twitch now and then (costs a few frames each time, nothing in between) */
  alive?: boolean;
  onState?: (s: LiquidStatus) => void;
}

interface Drop {
  x: number;
  y: number;
  vy: number;
  r: number;
}
interface Splash {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}
interface Pour {
  st: 'form' | 'free';
  x: number;
  y: number;
  vy: number;
  r: number;
  ft: number;
  e: Spring;
}

export class LiquidButtonBody implements Body {
  W = 300;
  state: LiquidStatus = 'idle';
  hover = false;
  press = false;
  disabled = false;
  visible = true;
  px = 150;
  py = H / 2;

  /** options (settable after construction) */
  holdMs: number | undefined;
  alive = false;
  onState?: (s: LiquidStatus) => void;

  /** where the busy phase gets its pace from */
  private timed = false; // self-timed demo run
  private complete = false; // the work is done, finish when the choreography allows
  private progress: number | undefined; // 0..1 from the app
  private t = 0;
  private acc = 0;
  private dwell = true; // still-mode minimum busy time elapsed

  private bx = new Spring(0, 230);
  private by = new Spring(0, 230);
  private sx = new Spring(1, 360);
  private sy = new Spring(1, 360);
  private rad = new Spring(R0, 170);
  private bxo = 0;
  private sxo = 1;
  private syo = 1;
  private level = new Spring(0, 58);
  private wave = new WaveField(WAVE_N);
  private lab = [new Spring(0, 280), new Spring(1, 280), new Spring(1, 280), new Spring(1, 280)];
  private cx: Spring[] = [];
  private cy: Spring[] = [];
  private cs = new Spring(1, 420);
  private ring = new Spring(1, 260);
  private chk = new Spring(0, 260);
  private bar = new Spring(-26, 70, 0.35);
  private barA = new Spring(0, 200, 0.7);
  private barDir = 1;
  private bu = new Float32Array(M);
  private bv = new Float32Array(M);
  private arw = new Spring(0, 120, 0.4);
  private arw2 = new Spring(0, 70, 0.55);
  private fired = false;
  private gap = new Spring(3.5, 520, 0.5); // create: gap between the five squares
  private flood = new Spring(0, 70, 0.8); // create: radius of the flood
  private pen = { x: 0, y: 0, vx: 0, vy: 0, wp: 1, on: false };
  private trail: Array<[number, number]> = [];
  private drops: Drop[] = [];
  private sp: Splash[] = [];
  private ex: Pour[] = [];
  private nz = new Spring(0, 520, 0.45);
  private nzx = 150;
  private landed = 0;
  private spawned = 0;
  private spawnT = 0;
  private exStarted = 0;
  private released = 0;
  private lastEv = 0;
  private all: Spring[];

  private texts: string[] = ['', '', '', ''];
  private busyFmt?: (pct: number) => string;
  private lastBusy = '';
  private timer: ReturnType<typeof setTimeout> | undefined;
  private noiseTimer: ReturnType<typeof setTimeout> | undefined;
  private dwellTimer: ReturnType<typeof setTimeout> | undefined;
  private fitDirty = true;

  constructor(
    readonly kind: LiquidKind,
    readonly els: LbEls,
    opts: LbOptions = {},
  ) {
    this.holdMs = opts.holdMs;
    this.alive = !!opts.alive;
    this.onState = opts.onState;
    for (let j = 0; j < 4; j++) {
      this.cx.push(new Spring(0, 520, 0.5));
      this.cy.push(new Spring(0, 520, 0.5));
    }
    this.all = [
      this.bx, this.by, this.sx, this.sy, this.rad, this.level, this.cs, this.ring, this.chk, this.nz,
      this.bar, this.barA, this.arw, this.arw2, this.gap, this.flood,
      ...this.lab, ...this.cx, ...this.cy,
    ];
    this.ring.x = this.ring.t = 1;
    this.arw.t = this.arw.x = 0;
    this.gap.x = this.gap.t = 3.5;
    this.bar.x = this.bar.t = -26;
    this.setLabelSlot(0);
    for (let j = 0; j < 4; j++) this.lab[j].x = this.lab[j].t;
  }

  /* ---------------------------------------------------------------------------- public API -- */

  /** Texts for the four slots. `busy` may be a function of the percentage (import / export). */
  setTexts(t: { idle: string; busy: string; done: string; error: string }, busyFmt?: (pct: number) => string): void {
    this.texts = [t.idle, t.busy, t.done, t.error];
    this.busyFmt = busyFmt;
    this.lastBusy = '';
    for (let j = 0; j < 4; j++) {
      const node = this.els.texts[j];
      if (node) node.textContent = j === 1 ? this.busyText() : this.texts[j];
    }
    this.fitDirty = true;
    this.fitAll();
  }

  /** Read the box once (on mount and when it resizes) and redraw. Never called per frame. */
  measure(): void {
    const { button, svg, clipr, body } = this.els;
    const bw = button.clientWidth;
    const bh = button.clientHeight;
    if (!bw || !bh) return;
    const w = (bw / bh) * H;
    if (Math.abs(w - this.W) > 0.01) {
      this.W = w;
      svg.setAttribute('viewBox', `0 0 ${f(w)} ${H}`);
      for (const r of [clipr, body]) r.setAttribute('width', f(w));
      this.fitDirty = true;
      this.aimRest();
    }
    this.fitAll();
    this.snap();
    this.render();
  }

  /** the text widths depend on the font: call again when fonts finish loading */
  refit(): void {
    this.fitDirty = true;
    this.fitAll();
  }

  /** Start a run from the button itself. `timed`: nobody reports completion, so it paces itself. */
  begin(timed: boolean): void {
    if (this.disabled || this.state === 'busy' || this.state === 'done') return;
    this.timed = timed;
    this.start();
  }

  /** Drive the state from outside (a controlled `status` prop, a mutation, a form). */
  apply(s: LiquidStatus): void {
    if (s === 'busy') {
      if (this.state !== 'busy') {
        this.timed = false;
        this.start();
      }
    } else if (s === 'done') {
      if (this.state === 'busy') {
        this.complete = true;
        this.advanceStill();
      } else if (this.state !== 'done') this.finish();
    } else if (s === 'error') {
      if (this.state !== 'error') this.fail();
    } else if (this.state !== 'idle') this.cancel();
    wake(this);
  }

  /** 0..1 real progress for import / export. Without it the button paces itself. */
  setProgress(p: number | undefined): void {
    this.progress = p === undefined ? undefined : clamp(p, 0, 1);
    this.advanceStill();
    if (this.state === 'busy') wake(this);
  }

  cancel(): void {
    this.clearLists();
    this.enter('idle');
    if (this.kind === 'scan') this.bar.t = this.W + 50;
    wake(this);
  }

  fail(): void {
    this.clearLists();
    this.enter('error');
    this.level.t = 0;
    this.barA.t = 0;
    this.bar.t = this.W + 50;
    this.arw.t = 0;
    this.arw2.t = 0;
    this.nz.t = 0;
    for (let j = 0; j < 4; j++) {
      this.cx[j].t = DIR[j][0] * 4;
      this.cy[j].t = DIR[j][1] * 4;
    }
    this.gap.t = 9;
    this.bxo = 0;
    this.sxo = 1;
    this.syo = 1;
    // a flinch: the whole button is shoved and rings back
    this.kick(this.bx, -520);
    this.kick(this.ring, -2.4);
    this.kick(this.gap, 60);
    wake(this);
  }

  /** pointer */
  setPointer(x: number, y: number): void {
    this.px = x;
    this.py = y;
  }
  /** a gentle shove of the surface where the pointer enters */
  enterAt(c: number): void {
    if (this.kind === 'create') return; // the plus has no liquid surface
    this.wave.poke(c / (this.W / (WAVE_N - 1)), 70, 3);
  }

  wakeUp(): void {
    wake(this);
  }

  dispose(): void {
    clearTimeout(this.timer);
    clearTimeout(this.noiseTimer);
    clearTimeout(this.dwellTimer);
    unschedule(this);
  }

  /** Idle life. Safe to call repeatedly. */
  scheduleNoise(): void {
    clearTimeout(this.noiseTimer);
    if (!this.alive || motion.reduced || motion.instant) return;
    this.noiseTimer = setTimeout(() => {
      if (this.state === 'idle' && !this.disabled && this.visible) {
        const j = (Math.random() * 4) | 0;
        this.cx[j].v += rnd(-16, 16);
        this.cy[j].v += rnd(-16, 16);
        this.ring.v += rnd(-0.5, 0.5);
        if (this.kind === 'continue') this.arw.v += rnd(-30, 30);
        wake(this);
      }
      this.scheduleNoise();
    }, rnd(1200, 3600));
  }

  /* ------------------------------------------------------------------------------- internals -- */

  private get still(): boolean {
    return motion.reduced || motion.instant;
  }

  private kick(s: Spring, dv: number): void {
    if (!motion.reduced) s.v += dv;
  }

  private setLabelSlot(L: number): void {
    for (let j = 0; j < 4; j++) this.lab[j].t = j === L ? 0 : j < L ? -1 : 1;
  }

  private busyText(): string {
    const p = this.pct();
    if (p >= 0 && this.busyFmt) return this.busyFmt(p);
    return this.texts[1];
  }

  /** percentage shown while busy, or -1 for kinds without one */
  private pct(): number {
    if (this.kind === 'import') return Math.round((100 * this.landed) / DROPS);
    if (this.kind === 'export') return Math.round((100 * this.released) / POURS);
    return -1;
  }

  /** how many of `count` events the work has earned so far */
  private want(count: number): number {
    if (this.complete) return count;
    const p = this.progress !== undefined ? this.progress : Math.min(0.9, this.t / (count * 0.6));
    return Math.min(count, Math.ceil(p * count - 1e-6));
  }

  private fitAll(): void {
    if (!this.fitDirty) return;
    this.fitDirty = false;
    for (let j = 0; j < 4; j++) this.fit(j);
  }

  private fit(j: number): void {
    const t = this.els.texts[j];
    if (!t || typeof t.getComputedTextLength !== 'function') return;
    const avail = this.kind === 'continue' ? this.W - 28 - 118 : this.W - 92 - 24;
    const base = 28;
    t.removeAttribute('textLength');
    t.removeAttribute('lengthAdjust');
    t.setAttribute('font-size', String(base));
    let L = 0;
    try {
      L = t.getComputedTextLength();
    } catch {
      L = 0;
    }
    let fs = base;
    if (L > avail && avail > 0) {
      fs = Math.max(base * 0.62, (base * avail) / L);
      t.setAttribute('font-size', f(fs));
      try {
        L = t.getComputedTextLength();
      } catch {
        L = 0;
      }
      if (L > avail) {
        t.setAttribute('textLength', f(avail));
        t.setAttribute('lengthAdjust', 'spacingAndGlyphs');
      }
    }
    t.setAttribute('y', f(H / 2 + fs * 0.36));
  }

  private enter(s: LiquidStatus): void {
    this.state = s;
    this.t = 0;
    clearTimeout(this.timer);
    this.setLabelSlot(s === 'idle' ? 0 : s === 'busy' ? 1 : s === 'done' ? 2 : 3);
    for (let j = 0; j < 4; j++) {
      this.cx[j].t = 0;
      this.cy[j].t = 0;
    }
    this.gap.t = 3.5;
    if (s === 'idle') {
      this.level.t = 0;
      this.barA.t = 0;
      this.nz.t = 0;
      this.bxo = 0;
      this.sxo = 1;
      this.syo = 1;
      this.arw.t = 0;
      this.ring.t = 1;
      this.chk.t = 0;
      this.flood.t = 0;
      this.kick(this.gap, 30);
      this.scheduleNoise();
    }
    if (s === 'done') {
      this.ring.t = 0;
      if (this.kind !== 'continue' && this.kind !== 'create' && (!this.pen.on || this.chk.t < 0.5)) this.startPen();
    }
    if (s === 'error') {
      this.ring.t = 1;
      this.chk.t = 0;
    }
    if (s === 'done' || s === 'error') {
      const ms = this.holdMs ?? (s === 'error' ? ERROR_HOLD : HOLD[this.kind]) * 1000;
      if (Number.isFinite(ms) && ms > 0) {
        this.timer = setTimeout(() => {
          if (this.state === s) {
            this.enter('idle');
            wake(this);
          }
        }, ms);
      }
    }
    this.onState?.(s);
  }

  private clearLists(): void {
    this.drops.length = 0;
    this.sp.length = 0;
    this.ex.length = 0;
  }

  private startPen(): void {
    const p = this.pen;
    p.x = PW[0][0];
    p.y = PW[0][1];
    p.vx = 0;
    p.vy = 0;
    p.wp = 1;
    p.on = true;
    this.trail = [[p.x, p.y]];
    this.chk.x = 1;
    this.chk.v = 0;
    this.chk.t = 1;
  }

  private finishPen(): void {
    const p = this.pen;
    p.on = true;
    p.wp = PW.length - 1;
    p.x = PW[PW.length - 1][0];
    p.y = PW[PW.length - 1][1];
    p.vx = p.vy = 0;
    this.trail = PW.map((q) => [q[0], q[1]] as [number, number]);
    this.chk.x = this.chk.t = 1;
  }

  private finish(): void {
    this.enter('done');
    const k = this.kind;
    if (k === 'scan') {
      this.level.t = 0;
      this.barA.t = 0;
      this.bar.t = this.W + 50;
    }
    if (k === 'import' || k === 'confirm') this.level.t = 1;
    if (k === 'export') this.level.t = 0;
    if (k === 'create') {
      this.flood.t = 270;
      this.kick(this.gap, 70);
      this.kick(this.by, 40);
    }
    if (k !== 'create') {
      for (let j = 0; j < 4; j++) {
        this.cx[j].t = -DIR[j][0] * 2.2;
        this.cy[j].t = -DIR[j][1] * 2.2;
      }
    }
    if (k === 'continue') this.enter('idle');
  }

  private start(): void {
    this.clearLists();
    this.landed = 0;
    this.spawned = 0;
    this.spawnT = 0.12;
    this.exStarted = 0;
    this.released = 0;
    this.fired = false;
    this.lastEv = 0;
    this.barDir = 1;
    this.complete = this.timed;
    this.dwell = !this.still;
    this.enter('busy');
    const k = this.kind;
    if (k === 'scan') {
      this.bar.x = -26;
      this.bar.v = 0;
      this.bar.t = this.W - 34;
      this.barA.t = 1;
      this.level.t = 0.07;
      this.bu.fill(0);
      this.bv.fill(0);
    }
    if (k === 'export' || k === 'confirm') this.level.t = 1;
    if (k === 'continue') {
      this.bxo = -9;
      this.arw.t = -17;
      this.arw2.t = -17;
      this.sxo = 0.97;
      this.syo = 1.03;
    }
    if (this.still) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = setTimeout(() => {
        this.dwell = true;
        this.advanceStill();
        wake(this);
      }, MIN_BUSY[k] * 1000 + 250);
    }
    this.advanceStill();
  }

  /**
   * Reduced motion and the `off` tier: no drops, no pours, no sweeping. The same state machine runs,
   * but progress is shown by the level and the label, and completion is immediate after a short dwell.
   */
  private advanceStill(): void {
    if (!this.still || this.state !== 'busy') return;
    const k = this.kind;
    if (k === 'import') {
      this.landed = this.want(DROPS);
      this.level.t = this.landed / DROPS;
    } else if (k === 'export') {
      this.released = this.want(POURS);
      this.level.t = Math.max(0, 1 - this.released / POURS);
    } else if (k === 'scan') this.level.t = 0.07;
    if (this.complete && this.dwell) {
      this.clearLists();
      this.finish();
    }
  }

  private surfAt(x: number): number {
    return H * (1 - this.level.x) - this.wave.at(x / (this.W / (WAVE_N - 1)));
  }

  private aimRest(): void {
    this.aim();
  }

  /** Targets that follow the pointer and the state. Called before every step and before a snap. */
  private aim(): void {
    const hov = this.hover && !this.disabled;
    const prs = this.press && !this.disabled;
    const busy = this.state === 'busy';
    this.bx.t = (hov ? clamp((this.px - this.W / 2) * 0.05, -8, 8) : 0) + this.bxo;
    this.by.t = (hov ? clamp((this.py - H / 2) * 0.1, -4, 4) : 0) + (prs ? 2 : 0);
    this.sx.t = (prs ? 1.03 : 1) * this.sxo;
    this.sy.t = (prs ? 0.945 : 1) * this.syo;
    this.rad.t = (busy && this.kind !== 'continue' ? 20 : R0) + (hov && this.state === 'idle' ? 3 : 0);
    this.cs.t = prs ? 0.86 : 1;
    if (this.kind === 'create') {
      const idleG = prs ? 0 : hov ? 5 : 3.5;
      if (this.state === 'idle') this.gap.t = idleG;
      else if (busy) this.gap.t = Math.floor(this.t / 0.45) % 2 ? 3.5 : -1;
    }
  }

  /* ------------------------------------------------------------------------------------ step -- */

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
    this.t += dt;
    this.aim();
    const k = this.kind;
    if (this.still) this.advanceStill();
    else if (k === 'scan') this.stepScan(dt);
    else if (k === 'import') this.stepImport(dt);
    else if (k === 'export') this.stepExport(dt);
    else if (k === 'confirm') this.stepConfirm();
    else if (k === 'continue') this.stepContinue();
    else if (k === 'create') this.stepCreate();

    for (const s of this.all) s.step(dt);

    if (k !== 'create') this.wave.step(dt, this.bx.a, this.by.a);

    // the pen has mass: it overshoots the corner of the check and settles
    const p = this.pen;
    if (p.on) {
      const tg = PW[Math.min(p.wp, PW.length - 1)];
      const dx = tg[0] - p.x;
      const dy = tg[1] - p.y;
      p.vx += (860 * dx - 40 * p.vx) * dt;
      p.vy += (860 * dy - 40 * p.vy) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.wp < PW.length - 1 && Math.hypot(dx, dy) < 5.5) p.wp++;
    }
    if (this.state !== 'done' && this.chk.x < 0.03 && p.on) {
      p.on = false;
      this.trail = [];
    }
  }

  private poke(x: number, amp: number, w: number): void {
    this.wave.poke(x / (this.W / (WAVE_N - 1)), amp, w);
  }

  private mayFinish(): boolean {
    return this.complete && this.t >= MIN_BUSY[this.kind];
  }

  private stepScan(dt: number): void {
    const W = this.W;
    if (this.state === 'busy') {
      const tgt = this.barDir > 0 ? W - 34 : 34;
      this.bar.t = tgt;
      if (Math.abs(this.bar.x - tgt) < 24) this.barDir = -this.barDir;
      const ph = Math.floor(this.t / 0.55) % 2;
      for (let j = 0; j < 4; j++) {
        this.cx[j].t = ph ? 0 : -DIR[j][0] * 6;
        this.cy[j].t = ph ? 0 : -DIR[j][1] * 6;
      }
      // self-timed runs scan for 3.2 s; real work scans until it reports back
      if (this.timed ? this.t > 3.2 : this.mayFinish()) this.finish();
    }
    if (this.barA.x > 0.01 || this.barA.t > 0) {
      // a flexible string: the bar's acceleration bends it, tension straightens it
      const { bu, bv } = this;
      for (let j = 1; j < M - 1; j++) {
        const g = Math.sin((Math.PI * j) / (M - 1));
        const a = -this.bar.a * 0.075 * g - 160 * bu[j] - 7 * bv[j] + 520 * (bu[j - 1] + bu[j + 1] - 2 * bu[j]);
        bv[j] += a * dt;
      }
      for (let j = 1; j < M - 1; j++) bu[j] = clamp(bu[j] + bv[j] * dt, -18, 18);
      if (this.state === 'busy') {
        // the bar drags a wake through the liquid floor
        const c = this.bar.x / (W / (WAVE_N - 1));
        const amp = clamp(this.bar.v, -700, 700) * 0.06 * dt;
        this.wave.poke(c, amp, 3);
      }
    }
  }

  private stepImport(dt: number): void {
    const W = this.W;
    if (this.state === 'busy') {
      this.spawnT -= dt;
      if (this.spawned < this.want(DROPS) && this.spawnT <= 0) {
        this.drops.push({ x: rnd(W * 0.2, W * 0.86), y: -116, vy: rnd(0, 80), r: rnd(7.5, 10.5) });
        this.spawned++;
        this.spawnT = this.complete ? rnd(0.12, 0.2) : rnd(0.26, 0.42);
      }
      this.level.t = this.landed / DROPS;
      if (this.landed >= DROPS && this.complete && this.t - this.lastEv > 0.75) this.finish();
    }
    for (let n = this.drops.length - 1; n >= 0; n--) {
      const d = this.drops[n];
      d.vy += G * dt;
      d.y += d.vy * dt;
      const ry = d.r * (1 + clamp(d.vy / 1500, 0, 0.55));
      if (d.y + ry >= this.surfAt(d.x) && d.y > -30) {
        this.drops.splice(n, 1);
        if (this.state === 'busy') {
          this.landed++;
          this.lastEv = this.t;
          this.poke(d.x, -clamp(d.vy, 200, 900) * 0.55, 2.4);
          this.by.v += 40 + d.vy * 0.05;
          this.ring.v -= 2.2;
          for (let j = 0; j < 4; j++) {
            this.cx[j].v += DIR[j][0] * -90;
            this.cy[j].v += DIR[j][1] * -90;
          }
          const sy = this.surfAt(d.x);
          for (let q = 0; q < 4; q++) {
            this.sp.push({ x: d.x, y: sy - 1, vx: rnd(-120, 120), vy: -rnd(140, 290), r: rnd(1.7, 3.4) });
          }
        }
      }
    }
    for (let n = this.sp.length - 1; n >= 0; n--) {
      const s = this.sp[n];
      s.vy += G * 1.1 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.vy > 0 && s.y >= this.surfAt(s.x)) {
        this.sp.splice(n, 1);
        this.poke(s.x, -35, 1.6);
      } else if (s.x < 0 || s.x > W) this.sp.splice(n, 1);
    }
  }

  private stepExport(dt: number): void {
    const W = this.W;
    if (this.state === 'busy') {
      const k = this.exStarted;
      const lag = this.complete ? 0.35 : 0.62;
      if (k < this.want(POURS) && this.t > 0.8 + k * lag && !this.ex.some((d) => d.st === 'form')) {
        const x = rnd(W * 0.3, W * 0.78);
        this.ex.push({ st: 'form', x, y: -3, vy: 0, r: rnd(7.5, 9.5), ft: 0, e: new Spring(0, 1100, 0.1) });
        this.nzx = x;
        this.nz.t = 1;
        this.exStarted++;
        this.poke(x, 160, 3);
      }
      if (this.released >= POURS && this.complete && this.t - this.lastEv > 0.55) this.finish();
    }
    for (let n = this.ex.length - 1; n >= 0; n--) {
      const d = this.ex[n];
      d.e.step(dt);
      if (d.st === 'form') {
        // pressure builds under the drop; surface tension holds the neck until it can't
        d.ft += dt;
        const fp = 2700 * clamp(d.ft / 0.32, 0, 1);
        const a = -fp - 70 * (d.y + 5) - 8 * d.vy;
        d.vy += a * dt;
        d.y += d.vy * dt;
        if (d.y < -37) {
          d.st = 'free';
          d.vy -= 150;
          d.e.v = (Math.random() < 0.5 ? -1 : 1) * 15;
          this.nz.t = 0;
          this.released++;
          this.lastEv = this.t;
          this.by.v += 150;
          this.sy.v -= 0.9;
          this.sx.v += 0.4;
          this.level.t = Math.max(0, 1 - this.released / POURS);
          this.poke(d.x, -200, 3);
          for (let j = 0; j < 4; j++) {
            this.cx[j].v += DIR[j][0] * 170;
            this.cy[j].v += DIR[j][1] * 170;
          }
          this.ring.v += 2.6;
        }
      } else {
        d.vy += 240 * dt;
        d.y += d.vy * dt;
        if (d.y < -170) this.ex.splice(n, 1);
      }
    }
  }

  private stepConfirm(): void {
    if (this.state !== 'busy') return;
    this.rad.t = 18;
    for (let j = 0; j < 4; j++) {
      this.cx[j].t = -DIR[j][0] * 3;
      this.cy[j].t = -DIR[j][1] * 3;
    }
    if (!this.pen.on && this.t > 0.1 && this.complete) {
      this.ring.t = 0;
      this.startPen();
    }
    if (this.mayFinish()) this.finish();
  }

  private stepContinue(): void {
    if (this.state === 'busy') {
      if (!this.fired && this.t > 0.16) {
        // let go of the rubber band: the arrow slingshots out and the body follows through
        this.fired = true;
        this.bxo = 0;
        this.sxo = 1;
        this.syo = 1;
        this.arw.t = 0;
        this.arw.v = motion.reduced ? 0 : 980;
        this.arw2.t = 0;
        this.kick(this.bx, 420);
        this.kick(this.sx, 1.5);
        this.kick(this.sy, -1.3);
        this.level.t = 0.16;
        this.poke(34, 320, 5);
      }
      if (this.mayFinish()) {
        this.level.t = 0;
        this.enter('idle');
      }
    }
    this.arw2.t = this.arw.x;
  }

  private stepCreate(): void {
    if (this.state === 'busy' && this.mayFinish()) this.finish();
  }

  /* --------------------------------------------------------------------------------- Body API -- */

  settled(): boolean {
    if (this.state === 'busy') return false;
    for (const s of this.all) if (!s.calm()) return false;
    if (this.kind !== 'create' && !this.wave.calm()) return false;
    if (this.drops.length || this.sp.length || this.ex.length) return false;
    const p = this.pen;
    if (p.on && this.state === 'done') {
      const last = PW[PW.length - 1];
      if (p.wp < PW.length - 1 || Math.hypot(p.vx, p.vy) > 1 || Math.hypot(last[0] - p.x, last[1] - p.y) > 0.2) return false;
    }
    return true;
  }

  snap(): void {
    this.aim();
    if (this.state === 'busy' && this.still) this.advanceStill();
    for (const s of this.all) s.snap();
    this.wave.clear();
    this.clearLists();
    this.nz.x = this.nz.t = 0;
    if (this.state === 'done' && this.kind !== 'continue' && this.kind !== 'create') this.finishPen();
    else if (this.state !== 'busy') {
      this.pen.on = false;
      this.trail = [];
    }
    this.acc = 0;
  }

  isVisible(): boolean {
    return this.visible && this.els.button.isConnected;
  }

  /* ------------------------------------------------------------------------------------ render -- */

  render(): void {
    const E = this.els;
    const W = this.W;
    const DX = W / (WAVE_N - 1);
    E.root.setAttribute(
      'transform',
      `translate(${f(this.bx.x)} ${f(this.by.x)}) translate(${f(W / 2)} ${H / 2}) scale(${f(this.sx.x)} ${f(this.sy.x)}) translate(${f(-W / 2)} ${-H / 2})`,
    );
    const r = f(clamp(this.rad.x, 2, H / 2));
    E.body.setAttribute('rx', r);
    E.clipr.setAttribute('rx', r);

    // the liquid in the vessel
    let d: string;
    if (this.kind === 'create') {
      const fr = Math.max(0, this.flood.x);
      d = fr > 0.5 ? el(44, H / 2, fr, fr) : 'M0 0';
    } else {
      const base = H * (1 - this.level.x);
      const h = this.wave.h;
      d = `M-3 ${H + 4}L-3 ${f(base - h[0])}`;
      for (let i = 0; i < WAVE_N; i++) d += `L${f(i * DX)} ${f(base - h[i])}`;
      d += `L${f(W + 3)} ${f(base - h[WAVE_N - 1])}L${f(W + 3)} ${H + 4}Z`;
      const w0 = 3.6 * this.barA.x;
      if (w0 > 0.2) d += this.barPath(w0);
    }
    E.liq.setAttribute('d', d);
    E.lqcp.setAttribute('d', d);

    // liquid in the air: falling drops, splashes, pours and their necks
    if (this.drops.length || this.sp.length || this.ex.length || this.nz.x > 0.05) {
      let air = '';
      for (const dr of this.drops) {
        const ry = dr.r * (1 + clamp(dr.vy / 1500, 0, 0.55));
        air += el(dr.x, dr.y, (dr.r * dr.r) / ry, ry);
      }
      for (const s of this.sp) air += el(s.x, s.y, s.r, s.r);
      const nr = 12 * clamp(this.nz.x, 0, 1.3);
      for (const dr of this.ex) {
        const e = clamp(dr.e.x, -0.35, 0.35);
        const ry = dr.r * (1 + e);
        air += el(dr.x, dr.y, (dr.r * dr.r) / ry, ry);
        if (dr.st === 'form') air += metaball(nr, dr.r, [this.nzx, -1], [dr.x, dr.y], 2.4, 0.5);
      }
      if (nr > 0.6) air += el(this.nzx, -1, nr, nr);
      E.air.setAttribute('d', air || 'M0 0');
    } else E.air.setAttribute('d', 'M0 0');

    // the label slots slide past each other
    for (let j = 0; j < 4; j++) {
      const L = this.lab[j].x;
      const g = E.labs[j];
      g.setAttribute('transform', `translate(0 ${f(L * 46)})`);
      g.setAttribute('opacity', f(clamp(1 - Math.abs(L) * 1.3, 0, 1)));
    }

    if (this.kind === 'continue') this.renderArrow();
    else if (this.kind === 'create') this.renderPlus();
    else this.renderMark();

    if (this.kind === 'import' || this.kind === 'export') {
      const bt = this.busyText();
      if (bt !== this.lastBusy) {
        this.lastBusy = bt;
        const node = E.texts[1];
        if (node) {
          node.textContent = bt;
          this.fit(1);
        }
      }
    }
  }

  private barPath(w0: number): string {
    const pts: Array<[number, number, number]> = [];
    for (let j = 0; j < M; j++) {
      const y = -2 + (j * (H + 4)) / (M - 1);
      const x = this.bar.x + this.bu[j];
      const w = w0 * (1 + 0.55 * Math.sin((Math.PI * j) / (M - 1)));
      pts.push([x - w, x + w, y]);
    }
    let s = `M${f(pts[0][0])} ${f(pts[0][2])}L${f(pts[0][1])} ${f(pts[0][2])}`;
    for (let j = 1; j < M; j++) s += `L${f(pts[j][1])} ${f(pts[j][2])}`;
    for (let j = M - 1; j >= 0; j--) s += `L${f(pts[j][0])} ${f(pts[j][2])}`;
    return s + 'Z';
  }

  private renderMark(): void {
    const E = this.els;
    const cs = CS * this.cs.x;
    let m = '';
    for (let j = 0; j < 4; j++) {
      const cx = IX + HOME[j][0] + CS / 2 + this.cx[j].x;
      const cy = IY + HOME[j][1] + CS / 2 + this.cy[j].x;
      m += rr(cx - cs / 2, cy - cs / 2, cs, cs, CR * this.cs.x);
    }
    const rs = Math.max(0, this.ring.x);
    if (rs > 0.03) {
      const c = IX + IC / 2;
      const c2 = IY + IC / 2;
      const o = (RO * rs) / 2;
      const i = (RI * rs) / 2;
      m += rr(c - o, c2 - o, o * 2, o * 2, ROR * rs);
      m += `M${f(c - i)} ${f(c2 - i)}h${f(i * 2)}v${f(i * 2)}h${f(-i * 2)}Z`;
    }
    E.mark.setAttribute('d', m);
    const p = this.pen;
    if (p.on && this.trail.length) {
      const tr = this.trail;
      const last = tr[tr.length - 1];
      if (Math.hypot(p.x - last[0], p.y - last[1]) > 0.45) tr.push([p.x, p.y]);
      let c = `M${f(IX + tr[0][0])} ${f(IY + tr[0][1])}`;
      for (let n = 1; n < tr.length; n++) c += `L${f(IX + tr[n][0])} ${f(IY + tr[n][1])}`;
      c += `L${f(IX + p.x)} ${f(IY + p.y)}`;
      E.chk.setAttribute('d', c);
      const s = Math.max(0, this.chk.x);
      const cc = IX + IC / 2;
      const c3 = IY + IC / 2;
      E.chk.setAttribute('transform', `translate(${f(cc)} ${f(c3)}) scale(${f(s)}) translate(${f(-cc)} ${f(-c3)})`);
    } else E.chk.setAttribute('d', 'M0 0');
  }

  private renderPlus(): void {
    const s = 8;
    const p = s + Math.max(-1, this.gap.x);
    const cx = 44;
    const cy = H / 2;
    let d = '';
    for (const o of [[0, 0], [p, 0], [-p, 0], [0, p], [0, -p]]) d += rr(cx + o[0] - s / 2, cy + o[1] - s / 2, s, s, 1.4);
    this.els.mark.setAttribute('d', d);
  }

  private renderArrow(): void {
    const W = this.W;
    const y = H / 2;
    const x0 = W - 94 + clamp(this.arw2.x, -30, 140);
    const tip = W - 46 + this.arw.x;
    const hd = 10;
    this.els.arw.setAttribute(
      'd',
      `M${f(x0)} ${f(y)}H${f(tip)}M${f(tip - hd)} ${f(y - hd)}L${f(tip)} ${f(y)}L${f(tip - hd)} ${f(y + hd)}`,
    );
  }
}
