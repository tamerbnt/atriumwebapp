import { motion } from './env';

/** The golden ratio. Used for proportions in the logo and for the damping ratio below. */
export const PHI = (1 + Math.sqrt(5)) / 2;

/**
 * Brand damping ratio ζ = 1/φ ≈ 0.618.
 * A step response overshoots by exp(-πζ/√(1-ζ²)) ≈ 8.5%, then settles. One soft overshoot, no wobble.
 */
export const ZETA = 1 / PHI;

/**
 * A damped spring: x'' = k (t - x) - 2 ζ √k x'
 *
 * `k` is the stiffness (ω₀² in 1/s²), `t` the target, `x` the position, `v` the velocity.
 *
 * `step(dt)` uses the exact analytic solution rather than numerical integration, so
 *  - it is unconditionally stable: a 100 ms hitch cannot make it explode,
 *  - it is frame-rate independent: one step of 1 s equals 240 steps of 1/240 s,
 *  - retargeting mid-flight keeps the velocity, so every interaction is interruptible.
 *
 * Springs are unit-agnostic (px, em, degrees, 0..1): the motion only depends on k and ζ.
 */
export class Spring {
  x: number;
  v = 0;
  t: number;
  /** acceleration after the last step, handy for effects driven by the vessel's own motion */
  a = 0;

  constructor(
    x: number,
    public k: number,
    /** designed damping ratio; the environment may raise it to 1 (reduced motion, lite tier) */
    public z: number = ZETA,
  ) {
    this.x = x;
    this.t = x;
  }

  step(dt: number): void {
    if (dt <= 0) return;
    const w = Math.sqrt(this.k);
    const z = motion.zeta(this.z);
    const d0 = this.x - this.t;
    const v0 = this.v;
    let d: number;
    let v: number;

    if (z < 1 - 1e-4) {
      // underdamped
      const wd = w * Math.sqrt(1 - z * z);
      const e = Math.exp(-z * w * dt);
      const c = Math.cos(wd * dt);
      const s = Math.sin(wd * dt);
      d = e * (d0 * c + ((v0 + z * w * d0) / wd) * s);
      v = e * (v0 * c - ((z * w * v0 + w * w * d0) / wd) * s);
    } else if (z <= 1 + 1e-4) {
      // critically damped
      const e = Math.exp(-w * dt);
      const b = v0 + w * d0;
      d = e * (d0 + b * dt);
      v = e * (v0 - w * b * dt);
    } else {
      // overdamped
      const s = Math.sqrt(z * z - 1);
      const r1 = w * (-z + s);
      const r2 = w * (-z - s);
      const c1 = (v0 - r2 * d0) / (r1 - r2);
      const c2 = d0 - c1;
      const e1 = Math.exp(r1 * dt);
      const e2 = Math.exp(r2 * dt);
      d = c1 * e1 + c2 * e2;
      v = c1 * r1 * e1 + c2 * r2 * e2;
    }

    this.x = this.t + d;
    this.v = v;
    this.a = -2 * z * w * v - w * w * d;
  }

  /** at rest, close enough that nobody can see or feel the difference */
  calm(eps = 0.003, veps = 0.02): boolean {
    return Math.abs(this.v) < veps && Math.abs(this.t - this.x) < eps;
  }

  snap(): void {
    this.x = this.t;
    this.v = 0;
    this.a = 0;
  }

  /** Add velocity (a flick). No-op when the user prefers reduced motion. */
  kick(dv: number): void {
    if (motion.reduced) return;
    this.v += dv;
  }
}
