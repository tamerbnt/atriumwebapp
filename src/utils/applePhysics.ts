/**
 * Apple Rubber-Band & Momentum Spring Physics Engine
 * Mathematically identical to iOS UIKit / WebKit UIScrollView overscroll physics.
 */

export interface SpringConfig {
  stiffness?: number; // k
  damping?: number;   // c
  mass?: number;      // m
  maxBounce?: number; // max displacement clamp in px
}

export const DEFAULT_APPLE_SPRING: Required<SpringConfig> = {
  stiffness: 380,
  damping: 32,
  mass: 0.82,
  maxBounce: 64,
};

export const APPLE_RESISTANCE_COEFFICIENT = 0.55;

/**
 * Apple Rubber-Band Formula:
 * b = (x * c * d) / (d + c * |x|) * sign(x)
 * Asymptotically approaches dimension d, giving progressive mechanical resistance.
 */
export function calculateRubberBandOffset(
  rawDelta: number,
  dimension: number = 800,
  constant: number = APPLE_RESISTANCE_COEFFICIENT,
  maxBounce: number = 64
): number {
  if (rawDelta === 0) return 0;
  const absDelta = Math.abs(rawDelta);
  const sign = Math.sign(rawDelta);
  const d = Math.max(dimension, 200);

  // Apple UIKit formula
  const displacement = (absDelta * constant * d) / (d + constant * absDelta);
  return sign * Math.min(displacement, maxBounce);
}

/**
 * State of a dynamic 2D harmonic spring
 */
export interface SpringState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Step a 1D spring forward by dt (seconds) using semi-implicit Euler integration
 */
export function stepSpring1D(
  currentPos: number,
  currentVel: number,
  targetPos: number = 0,
  dt: number,
  config: Required<SpringConfig> = DEFAULT_APPLE_SPRING
): { pos: number; vel: number; settled: boolean } {
  // Clamp dt to avoid instability on frame drops
  const safeDt = Math.min(dt, 0.033);

  const displacement = currentPos - targetPos;
  const springForce = -config.stiffness * displacement;
  const dampingForce = -config.damping * currentVel;
  const acceleration = (springForce + dampingForce) / config.mass;

  const nextVel = currentVel + acceleration * safeDt;
  const nextPos = currentPos + nextVel * safeDt;

  const isPositionSettled = Math.abs(nextPos - targetPos) < 0.15;
  const isVelocitySettled = Math.abs(nextVel) < 0.15;

  if (isPositionSettled && isVelocitySettled) {
    return { pos: targetPos, vel: 0, settled: true };
  }

  return { pos: nextPos, vel: nextVel, settled: false };
}
