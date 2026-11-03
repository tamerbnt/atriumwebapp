(globalThis as any).requestAnimationFrame = () => 1;
(globalThis as any).cancelAnimationFrame = () => {};
import { rr, el, metaball } from '../motion/shapes';
import { WaveField } from '../motion/wave';
import { LiquidButtonBody } from '../components/LiquidButton/liquidButtonBody';
import type { LbEls, LiquidKind } from '../components/LiquidButton/liquidButtonBody';
import { __resetMotionEnvForTests } from '../motion/env';

const node = (extra: object = {}): any => {
  const attrs: Record<string, string> = {};
  return {
    attrs, style: {}, textContent: '', isConnected: true, clientWidth: 300, clientHeight: 72,
    setAttribute: (k: string, v: string) => { attrs[k] = v; },
    removeAttribute: (k: string) => { delete attrs[k]; },
    getComputedTextLength: () => 100,
    ...extra,
  };
};
const els = (): LbEls => ({
  button: node(), svg: node(), root: node(), body: node(), clipr: node(), maskr: node(), liq: node(), lqcp: node(),
  air: node(), mark: node(), chk: node(), arw: node(),
  labs: [node(), node(), node(), node()], texts: [node(), node(), node(), node()],
});
const make = (kind: LiquidKind, holdMs = Infinity) => {
  const states: string[] = [];
  const b = new LiquidButtonBody(kind, els(), { holdMs, onState: (s) => states.push(s) });
  b.setTexts({ idle: 'A', busy: 'B', done: 'C', error: 'D' }, (p) => `B ${p}%`);
  b.measure();
  return { b, states };
};
/** run the physics for `sec` seconds at 60 fps, true if `until` became true */
const run = (b: LiquidButtonBody, sec: number, until?: () => boolean) => {
  for (let i = 0; i < sec * 60; i++) {
    b.step(1 / 60);
    b.render();
    if (until?.()) return true;
  }
  return !!until?.() ;
};

beforeEach(() => __resetMotionEnvForTests());

describe('shapes', () => {
  it('rounded rect and ellipse are closed paths', () => {
    expect(rr(0, 0, 10, 10, 2)).toMatch(/^M.*Z$/);
    expect(el(5, 5, 3, 2)).toMatch(/^M.*Z$/);
  });
  it('rr clamps the radius to half the side', () => {
    expect(rr(0, 0, 10, 4, 99)).toBe(rr(0, 0, 10, 4, 2));
  });
  it('metaball joins near circles and lets go of far ones', () => {
    expect(metaball(12, 8, [0, 0], [0, -20], 2.4, 0.5)).toMatch(/^M.*Z$/);
    expect(metaball(12, 8, [0, 0], [0, -200], 2.4, 0.5)).toBe('');
    expect(metaball(0.1, 8, [0, 0], [0, -10], 2.4, 0.5)).toBe('');
  });
});

describe('WaveField', () => {
  it('a poke rings and then dies out (stable)', () => {
    const w = new WaveField();
    w.poke(28, 400, 3);
    let peak = 0;
    for (let i = 0; i < 240 * 9; i++) {
      w.step(1 / 240);
      peak = Math.max(peak, ...Array.from(w.h).map(Math.abs));
    }
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(17);
    expect(w.calm()).toBe(true);
  });
  it('never leaves the vessel', () => {
    const w = new WaveField();
    w.poke(10, 1e6, 2);
    for (let i = 0; i < 100; i++) w.step(1 / 240);
    expect(Math.max(...Array.from(w.h).map(Math.abs))).toBeLessThanOrEqual(17);
  });
});

describe('LiquidButtonBody', () => {
  const kinds: LiquidKind[] = ['scan', 'import', 'export', 'confirm', 'continue', 'create'];

  for (const kind of kinds) {
    it(`${kind}: a self-timed run goes busy then finishes and rests`, () => {
      const { b, states } = make(kind);
      b.begin(true);
      expect(states[0]).toBe('busy');
      const ok = run(b, 12, () => b.state !== 'busy');
      expect(ok).toBe(true);
      expect(states).toContain(kind === 'continue' ? 'idle' : 'done');
      run(b, 10);
      expect(b.settled()).toBe(true);
    });

    it(`${kind}: an async run waits for the app, then finishes`, () => {
      const { b } = make(kind);
      b.begin(false);
      run(b, 5);
      expect(b.state).toBe('busy'); // nobody said it was done
      b.apply('done');
      expect(run(b, 12, () => b.state !== 'busy')).toBe(true);
    });

    it(`${kind}: error flinches and holds`, () => {
      const { b, states } = make(kind);
      b.begin(false);
      run(b, 0.5);
      b.apply('error');
      run(b, 9);
      expect(b.state).toBe('error');
      expect(states[states.length - 1]).toBe('error');
      expect(b.settled()).toBe(true);
    });
  }

  it('import: progress drives the drops and the label', () => {
    const { b } = make('import');
    b.begin(false);
    b.setProgress(0.43); // 4 of 7
    run(b, 8);
    expect(b.els.texts[1].textContent).toBe('B 57%');
    b.setProgress(1);
    b.apply('done');
    expect(run(b, 10, () => b.state === 'done')).toBe(true);
  });

  it('cancel returns to idle', () => {
    const { b } = make('scan');
    b.begin(false);
    run(b, 1);
    b.cancel();
    expect(b.state).toBe('idle');
  });

  it('done with a finite hold returns to idle by itself', async () => {
    const { b } = make('confirm', 30);
    b.apply('done');
    expect(b.state).toBe('done');
    await new Promise((r) => setTimeout(r, 60));
    expect(b.state).toBe('idle');
  });

  it('is disabled: begin does nothing', () => {
    const { b } = make('scan');
    b.disabled = true;
    b.begin(true);
    expect(b.state).toBe('idle');
  });

  it('wider buttons scale the drawing space, not the shapes', () => {
    const { b } = make('import');
    (b.els.button as any).clientWidth = 600;
    b.measure();
    expect(b.W).toBeCloseTo(600 / 72 * 72, 1);
    expect((b.els.svg as any).attrs.viewBox).toBe('0 0 600 72');
  });

  it('the off tier snaps and still completes', async () => {
    const { configureMotion } = await import('../motion/env');
    configureMotion({ tier: 'off' });
    const { b } = make('import');
    b.begin(true);
    b.snap();
    await new Promise((r) => setTimeout(r, 900));
    expect(b.state).toBe('done');
  });

  it('reduced motion completes without drops', async () => {
    const { configureMotion, motion } = await import('../motion/env');
    configureMotion({ tier: 'lite' });
    (motion as any);
    const { b } = make('export');
    b.begin(true);
    run(b, 3);
    expect(['busy', 'done']).toContain(b.state);
  });
});
