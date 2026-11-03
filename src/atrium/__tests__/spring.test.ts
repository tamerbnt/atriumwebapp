import { Spring, ZETA, PHI } from '../motion/spring';
import { __resetMotionEnvForTests } from '../motion/env';

beforeEach(() => __resetMotionEnvForTests());

/** peak of a unit step response */
function peak(z: number, k = 260): number {
  const s = new Spring(0, k, z);
  s.t = 1;
  let max = 0;
  for (let i = 0; i < 2400; i++) {
    s.step(1 / 240);
    max = Math.max(max, s.x);
  }
  return max - 1;
}

describe('Spring', () => {
  it('ζ = 1/φ overshoots by exp(-πζ/√(1-ζ²)) ≈ 8.5 %', () => {
    expect(ZETA).toBeCloseTo(1 / PHI, 12);
    const expected = Math.exp((-Math.PI * ZETA) / Math.sqrt(1 - ZETA * ZETA));
    expect(expected).toBeCloseTo(0.0846, 3);
    expect(peak(ZETA)).toBeCloseTo(expected, 3);
  });

  it('does not overshoot when critically damped or overdamped', () => {
    expect(peak(1)).toBeLessThan(1e-9);
    expect(peak(1.4)).toBeLessThan(1e-9);
  });

  it.each([0.35, ZETA, 1, 1.4])('is frame-rate independent (ζ = %f)', (z) => {
    const a = new Spring(0, 260, z);
    const b = new Spring(0, 260, z);
    const c = new Spring(0, 260, z);
    a.t = b.t = c.t = 1;
    a.v = b.v = c.v = 3;
    a.step(0.5); // one big step
    for (let i = 0; i < 120; i++) b.step(1 / 240); // 240 Hz
    for (let i = 0; i < 30; i++) c.step(1 / 60); // 60 Hz
    expect(a.x).toBeCloseTo(b.x, 9);
    expect(a.x).toBeCloseTo(c.x, 9);
    expect(a.v).toBeCloseTo(b.v, 7);
  });

  it('stays finite after an absurd 10 second hitch', () => {
    const s = new Spring(0, 900, 0.2);
    s.t = 100;
    s.step(10);
    expect(Number.isFinite(s.x)).toBe(true);
    expect(Math.abs(s.x - 100)).toBeLessThan(1e-6);
  });

  it('keeps its velocity when retargeted mid-flight (interruptible)', () => {
    const s = new Spring(0, 260);
    s.t = 1;
    for (let i = 0; i < 20; i++) s.step(1 / 240);
    const v = s.v;
    const x = s.x;
    s.t = -1;
    expect(s.v).toBe(v);
    expect(s.x).toBe(x);
    s.step(1 / 240);
    expect(Math.sign(s.v)).toBe(Math.sign(v)); // momentum carries on for a moment
  });

  it('settles and reports calm', () => {
    const s = new Spring(0, 260);
    s.t = 1;
    let n = 0;
    while (!s.calm() && n < 4800) {
      s.step(1 / 240);
      n++;
    }
    expect(n).toBeLessThan(1200); // under 5 s, in practice well under 1 s
    s.snap();
    expect(s.x).toBe(1);
    expect(s.v).toBe(0);
  });

  it('kick adds velocity', () => {
    const s = new Spring(1, 420, 0.35);
    s.kick(14);
    expect(s.v).toBe(14);
  });
});
