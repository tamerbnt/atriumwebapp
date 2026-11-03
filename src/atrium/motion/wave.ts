import { clamp } from './shapes';

/** columns in the liquid surface */
export const WAVE_N = 56;

const C2 = 2300; // wave speed² (columns² / s²)
const KK = 26; // restoring force toward the rest level (gravity)
const DAMP = 1.7; // viscosity
const LIMIT = 17; // the surface can never leave the vessel

/**
 * The liquid surface of a vessel: a damped 1-D wave equation on N columns.
 *
 *   h'' = c² ∂²h  −  k h  −  d h'  +  drive
 *
 * Neighbours pull each other level (surface tension), `k` pulls everything back to the rest level
 * (gravity), `d` is viscosity. The drive is the vessel's own acceleration, so when the button is
 * shoved sideways the liquid sloshes the other way: inertia, not a keyframe.
 *
 * Explicit symplectic Euler is stable here for dt < 1/96 s, so the caller steps it in 1/240 s slices.
 */
export class WaveField {
  readonly h: Float32Array;
  readonly hv: Float32Array;
  constructor(readonly n: number = WAVE_N) {
    this.h = new Float32Array(n);
    this.hv = new Float32Array(n);
  }

  /**
   * @param dt     seconds, ≤ 1/120
   * @param ax     horizontal vessel acceleration (tilts the surface)
   * @param ay     vertical vessel acceleration (lifts / drops the surface)
   */
  step(dt: number, ax = 0, ay = 0): void {
    const { n, h, hv } = this;
    const fy = -ay * 0.0035;
    const fx = ax * 0.011;
    for (let i = 0; i < n; i++) {
      const l = h[i > 0 ? i - 1 : 0];
      const r = h[i < n - 1 ? i + 1 : n - 1];
      const xi = (i / (n - 1)) * 2 - 1;
      hv[i] += (C2 * (l + r - 2 * h[i]) - KK * h[i] - DAMP * hv[i] - fx * xi + fy) * dt;
    }
    for (let i = 0; i < n; i++) h[i] = clamp(h[i] + hv[i] * dt, -LIMIT, LIMIT);
  }

  /** Give the surface a Gaussian shove at column position `c` (fractional), `w` columns wide. */
  poke(c: number, amp: number, w: number): void {
    const { n, hv } = this;
    for (let i = 0; i < n; i++) {
      const d = (i - c) / w;
      hv[i] += amp * Math.exp(-d * d);
    }
  }

  /** nearest column's height */
  at(c: number): number {
    return this.h[clamp(Math.round(c), 0, this.n - 1)];
  }

  /** true when the surface is flat and still */
  calm(eps = 0.06, veps = 1): boolean {
    const { n, h, hv } = this;
    for (let i = 0; i < n; i++) if (Math.abs(h[i]) > eps || Math.abs(hv[i]) > veps) return false;
    return true;
  }

  clear(): void {
    this.h.fill(0);
    this.hv.fill(0);
  }
}
