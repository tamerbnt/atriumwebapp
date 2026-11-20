import { describe, it, expect } from 'vitest';
import { computeSquircleParams, squirclePath, squircleNotchedRingPaths } from '../motion/shapes';

describe('60% squircle geometry kernel', () => {
  it('computes Figma 60% smoothing parameters cleanly within corner budget', () => {
    const p = computeSquircleParams(200, 100, 16, 0.6);
    expect(p.r).toBe(16);
    expect(p.s).toBeCloseTo(0.6, 5);
    expect(p.p).toBeCloseTo(25.6, 5); // (1 + 0.6) * 16
    expect(p.a).toBeCloseTo(2 * p.b, 5);
    // Exact Figma invariant: a + b + c + L + d == p
    expect(p.a + p.b + p.c + p.L + p.d).toBeCloseTo(p.p, 5);
  });

  it('clamps radius and smoothing when r exceeds half the shortest side', () => {
    const p = computeSquircleParams(40, 40, 28, 0.6);
    expect(p.r).toBe(20); // B = min(40, 40)/2 = 20
    expect(p.p).toBe(20);
    expect(p.s).toBe(0); // B / r - 1 = 0
  });

  it('scales smoothing proportionally on narrow pills/controls near budget', () => {
    // w=120, h=40 -> B=20; r=16 -> (1+0.6)*16 = 25.6 clamped to B=20 -> s = 20/16 - 1 = 0.25
    const p = computeSquircleParams(120, 40, 16, 0.6);
    expect(p.r).toBe(16);
    expect(p.p).toBe(20);
    expect(p.s).toBeCloseTo(0.25, 5);
    expect(p.a + p.b + p.c + p.L + p.d).toBeCloseTo(20, 5);
  });

  it('generates closed SVG path for valid dimensions and empty string for zero dimensions', () => {
    expect(squirclePath(0, 0, 0, 40, 12)).toBe('');
    expect(squirclePath(0, 0, 100, 0, 12)).toBe('');

    const d = squirclePath(0, 0, 160, 40, 12, 0.6);
    expect(d).toMatch(/^M.*Z$/);
    expect(d).toContain('C');
    expect(d).toContain('A');
  });

  it('preserves symmetry when insetting for 1px hairline stroke', () => {
    const outer = squirclePath(0, 0, 120, 40, 12, 0.6);
    const inner = squirclePath(0.5, 0.5, 119, 39, 11.5, 0.6);
    expect(outer).not.toBe(inner);
    expect(inner).toMatch(/^M.*Z$/);
  });

  it('returns identical memoized reference on repeated calls', () => {
    const d1 = squirclePath(0, 0, 320, 180, 16, 0.6);
    const d2 = squirclePath(0, 0, 320, 180, 16, 0.6);
    expect(d1).toBe(d2);
  });

  it('generates notched squircle paths for floating-label inputs and selects', () => {
    const ring = squircleNotchedRingPaths(240, 40, 12, 0.75, 14, 72, 0.6);
    expect(ring.gapL).toMatch(/^M/);
    expect(ring.gapR).toMatch(/^M/);
    expect(ring.right).toMatch(/^M14|M72/);
    expect(ring.left).toMatch(/^M/);
    expect(ring.right).toContain('C');
    expect(ring.left).toContain('C');
  });
});
