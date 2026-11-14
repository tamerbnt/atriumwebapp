import { describe, it, expect, beforeEach } from 'vitest';
import {
  Sp,
  setReducedMotionOverride,
  clamp,
} from '../../components/screens/membership/motion/adherentsMotion';

describe('Adherents Spring (Sp) Motion Module', () => {
  beforeEach(() => {
    setReducedMotionOverride(false);
  });

  it('correctly calculates k and d coefficients based on tune value', () => {
    // k = 0.08 + tune/100 * 0.16, d = 0.62 + tune/100 * 0.2
    const s22 = new Sp(0, 22);
    expect(s22.k).toBeCloseTo(0.08 + (22 / 100) * 0.16, 5); // 0.1152
    expect(s22.d).toBeCloseTo(0.62 + (22 / 100) * 0.2, 5); // 0.664

    const s26 = new Sp(0, 26);
    expect(s26.k).toBeCloseTo(0.08 + (26 / 100) * 0.16, 5); // 0.1216
    expect(s26.d).toBeCloseTo(0.62 + (26 / 100) * 0.2, 5); // 0.672
    s22.destroy();
    s26.destroy();
  });

  it('steps physics smoothly towards target value', () => {
    const s = new Sp(0, 22);
    s.t = 100;
    expect(s.x).toBe(0);
    expect(s.v).toBe(0);

    // One frame step (dt = 1)
    s.step(1);
    expect(s.x).toBeGreaterThan(0);
    expect(s.v).toBeGreaterThan(0);
    s.destroy();
  });

  it('settles and reports rest() when |target - x| < 0.02 and |v| < 0.02', () => {
    const s = new Sp(0, 22);
    s.t = 100;
    expect(s.rest()).toBe(false);

    let frames = 0;
    while (!s.rest() && frames < 500) {
      s.step(1);
      frames++;
    }

    // Must settle within reasonable frame count
    expect(frames).toBeLessThan(120);
    expect(Math.abs(s.t - s.x)).toBeLessThan(0.02);
    expect(Math.abs(s.v)).toBeLessThan(0.02);
    expect(s.rest()).toBe(true);
    s.destroy();
  });

  it('snap() instantly forces position to target and zeroes velocity', () => {
    const s = new Sp(0, 22);
    s.t = 100;
    s.step(1);
    s.step(1);
    expect(s.x).not.toBe(100);
    expect(s.v).not.toBe(0);

    s.snap();
    expect(s.x).toBe(100);
    expect(s.v).toBe(0);
    expect(s.rest()).toBe(true);
    s.destroy();
  });

  it('honors reduced motion by snapping to target without bouncing', () => {
    setReducedMotionOverride(true);
    const s = new Sp(0, 24);
    s.t = 100;
    s.step(1);

    expect(s.x).toBe(100);
    expect(s.v).toBe(0);
    expect(s.rest()).toBe(true);
    s.destroy();
  });

  it('clamps values correctly', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('exhibits 5-9% overshoot and reaches 90% in 117-150 ms at 60fps across tunes 20..28', () => {
    // Tunes: row presence 24, row expand 26, modal 28, metric count-up 20
    const tunes = [20, 24, 26, 28];
    const FRAME_MS = 16.67;

    tunes.forEach((tune) => {
      const s = new Sp(0, tune);
      s.t = 100;

      let maxX = 0;
      let frame90 = -1;

      for (let f = 1; f <= 120; f++) {
        s.step(1);
        if (s.x > maxX) maxX = s.x;
        if (s.x >= 90 && frame90 === -1) frame90 = f;
      }

      const overshootPct = maxX - 100;
      expect(overshootPct).toBeGreaterThanOrEqual(5);
      expect(overshootPct).toBeLessThanOrEqual(9);

      const timeTo90Ms = frame90 * (1000 / 60);
      expect(timeTo90Ms).toBeGreaterThanOrEqual(116.5);
      expect(timeTo90Ms).toBeLessThanOrEqual(150.5);
      expect(frame90).toBeGreaterThanOrEqual(7);
      expect(frame90).toBeLessThanOrEqual(9);

      s.destroy();
    });
  });

  it('rest and snap behaviors across tunes 20, 24, 26, 28', () => {
    [20, 24, 26, 28].forEach((tune) => {
      const s = new Sp(0, tune);
      s.t = 100;
      expect(s.rest()).toBe(false);

      // Step until settled
      let f = 0;
      while (!s.rest() && f < 300) {
        s.step(1);
        f++;
      }

      expect(s.rest()).toBe(true);
      expect(Math.abs(100 - s.x)).toBeLessThan(0.02);
      expect(Math.abs(s.v)).toBeLessThan(0.02);

      // Snap resets to exact target
      s.snap();
      expect(s.x).toBe(100);
      expect(s.v).toBe(0);
      expect(s.rest()).toBe(true);

      s.destroy();
    });
  });

  it('remains stable under 30fps / dropped-frame cadence using adaptive 2-substep integration', async () => {
    const { frame } = await import('../../components/screens/membership/motion/adherentsMotion');
    (globalThis as any).requestAnimationFrame = () => 1;
    const s = new Sp(0, 28);
    s.setTarget(100);

    let ts = 1000;
    frame(ts);
    let maxVal = s.x;
    for (let i = 0; i < 40; i++) {
      ts += 33.34; // ~30fps dropped frames (dt ≈ 2.0)
      frame(ts);
      if (s.x > maxVal) maxVal = s.x;
      if (s.rest()) break;
    }

    expect(maxVal).toBeLessThan(112);
    expect(s.rest()).toBe(true);
    expect(s.x).toBe(100);
    s.destroy();
  });
});
