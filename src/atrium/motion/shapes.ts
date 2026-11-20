import { f } from './liquid';

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

/** Rounded rectangle as an SVG path. The radius is limited to half the shorter side. */
export function rr(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  const R = f(r);
  return (
    `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${R} ${R} 0 0 1 ${f(x + w)} ${f(y + r)}` +
    `V${f(y + h - r)}A${R} ${R} 0 0 1 ${f(x + w - r)} ${f(y + h)}` +
    `H${f(x + r)}A${R} ${R} 0 0 1 ${f(x)} ${f(y + h - r)}` +
    `V${f(y + r)}A${R} ${R} 0 0 1 ${f(x + r)} ${f(y)}Z`
  );
}

/** Ellipse as an SVG path (two arcs). */
export function el(cx: number, cy: number, rx: number, ry: number): string {
  const X = f(rx);
  const Y = f(ry);
  return (
    `M${f(cx - rx)} ${f(cy)}A${X} ${Y} 0 1 0 ${f(cx + rx)} ${f(cy)}` + `A${X} ${Y} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`
  );
}

export type Pt = [number, number];

/**
 * Two circles joined by a liquid neck (the classic metaball bridge). `v` is the pinch (0.5 is a
 * relaxed neck), `handle` how far the bezier handles reach. Returns '' when the circles are too far
 * apart for the liquid to hold together, which is the moment the drop lets go.
 */
export function metaball(r1: number, r2: number, c1: Pt, c2: Pt, handle: number, v: number): string {
  const HP = Math.PI / 2;
  const dx = c2[0] - c1[0];
  const dy = c2[1] - c1[1];
  const d = Math.sqrt(dx * dx + dy * dy);
  const maxD = r1 + r2 * 2.6;
  if (r1 < 0.5 || r2 < 0.5 || d > maxD || d <= Math.abs(r1 - r2) + 0.01) return '';
  let u1 = 0;
  let u2 = 0;
  if (d < r1 + r2) {
    u1 = Math.acos(clamp((r1 * r1 + d * d - r2 * r2) / (2 * r1 * d), -1, 1));
    u2 = Math.acos(clamp((r2 * r2 + d * d - r1 * r1) / (2 * r2 * d), -1, 1));
  }
  const ab = Math.atan2(c1[1] - c2[1], c1[0] - c2[0]) + Math.PI; // angle from c1 to c2
  const spread = Math.acos(clamp((r1 - r2) / d, -1, 1));
  const a1 = ab + u1 + (spread - u1) * v;
  const a2 = ab - u1 - (spread - u1) * v;
  const a3 = ab + Math.PI - u2 - (Math.PI - u2 - spread) * v;
  const a4 = ab - Math.PI + u2 + (Math.PI - u2 - spread) * v;
  const P = (c: Pt, a: number, r: number): Pt => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  const p1 = P(c1, a1, r1);
  const p2 = P(c1, a2, r1);
  const p3 = P(c2, a3, r2);
  const p4 = P(c2, a4, r2);
  const tot = r1 + r2;
  const dd = Math.hypot(p1[0] - p3[0], p1[1] - p3[1]);
  let d2 = Math.min(v * handle, dd / tot);
  d2 *= Math.min(1, (d * 2) / tot);
  const R1 = r1 * d2;
  const R2 = r2 * d2;
  const h1 = P(p1, a1 - HP, R1);
  const h2 = P(p2, a2 + HP, R1);
  const h3 = P(p3, a3 + HP, R2);
  const h4 = P(p4, a4 - HP, R2);
  const s = (p: Pt) => `${f(p[0])} ${f(p[1])}`;
  return (
    `M${s(p1)}C${s(h1)} ${s(h3)} ${s(p3)}` +
    `A${f(r2)} ${f(r2)} 0 ${d > r1 ? 0 : 1} 0 ${s(p4)}` +
    `C${s(h4)} ${s(h2)} ${s(p2)}` +
    `A${f(r1)} ${f(r1)} 0 ${d > r2 ? 1 : 0} 0 ${s(p1)}Z`
  );
}

/* ==========================================================================
   60% Continuous Squircle Geometry (Figma / figma-squircle construction)
   ========================================================================== */

const SQ_DEFAULT_SMOOTHING = 0.6;
const DEG = Math.PI / 180;
const SQRT2 = Math.SQRT2;
const f3 = (n: number): string => (Math.round(n * 1000) / 1000).toString();

export interface SquircleParams {
  w: number;
  h: number;
  r: number;
  s: number;
  p: number;
  a: number;
  b: number;
  c: number;
  d: number;
  L: number;
}

/**
 * Computes exact Figma-equivalent squircle corner parameters for width `w`, height `h`,
 * corner radius `r`, and smoothing `smoothing` (default 0.6).
 */
export function computeSquircleParams(
  w: number,
  h: number,
  r: number,
  smoothing = SQ_DEFAULT_SMOOTHING,
): SquircleParams {
  const B = Math.min(w, h) / 2;
  if (B <= 0 || r <= 0) {
    return { w, h, r: 0, s: 0, p: 0, a: 0, b: 0, c: 0, d: 0, L: 0 };
  }
  const cr = Math.min(Math.max(0, r), B);
  const rawS = Math.max(0, smoothing);
  const p = Math.min((1 + rawS) * cr, B);
  const s = cr > 0 ? Math.max(0, Math.min(rawS, B / cr - 1)) : 0;
  const arcDeg = 90 * (1 - s);
  const L = Math.sin((arcDeg / 2) * DEG) * cr * SQRT2;
  const t = cr * Math.tan(((90 - arcDeg) / 4) * DEG);
  const beta = 45 * s * DEG;
  const c = t * Math.cos(beta);
  const d = c * Math.tan(beta);
  const b = Math.max(0, (p - L - c - d) / 3);
  const a = 2 * b;
  return { w, h, r: cr, s, p, a, b, c, d, L };
}

function squircleCornerCommands(
  sx: number,
  sy: number,
  ux: number,
  uy: number,
  vx: number,
  vy: number,
  params: SquircleParams,
  sweep: 0 | 1 = 1,
): string {
  const { r, a, b, c, d, L } = params;
  const c1x = sx + a * ux;
  const c1y = sy + a * uy;
  const c2x = sx + (a + b) * ux;
  const c2y = sy + (a + b) * uy;
  const p1x = sx + (a + b + c) * ux + d * vx;
  const p1y = sy + (a + b + c) * uy + d * vy;

  const p2x = p1x + L * ux + L * vx;
  const p2y = p1y + L * uy + L * vy;

  const d1x = p2x + d * ux + c * vx;
  const d1y = p2y + d * uy + c * vy;
  const d2x = p2x + d * ux + (b + c) * vx;
  const d2y = p2y + d * uy + (b + c) * vy;
  const endX = p2x + d * ux + (a + b + c) * vx;
  const endY = p2y + d * uy + (a + b + c) * vy;

  return (
    `C${f3(c1x)} ${f3(c1y)} ${f3(c2x)} ${f3(c2y)} ${f3(p1x)} ${f3(p1y)}` +
    `A${f3(r)} ${f3(r)} 0 0 ${sweep} ${f3(p2x)} ${f3(p2y)}` +
    `C${f3(d1x)} ${f3(d1y)} ${f3(d2x)} ${f3(d2y)} ${f3(endX)} ${f3(endY)}`
  );
}

const SQUIRCLE_CACHE_LIMIT = 512;
const squirclePathCache = new Map<string, string>();

/**
 * Generates an exact SVG path string for a continuous squircle box.
 * Uses a bounded FIFO/LRU cache keyed by rounded geometry so identical cards/rows cost O(1).
 */
export function squirclePath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  smoothing = SQ_DEFAULT_SMOOTHING,
): string {
  if (!(w > 0 && h > 0)) return '';

  const rw = Math.round(w * 100) / 100;
  const rh = Math.round(h * 100) / 100;
  const rx = Math.round(x * 100) / 100;
  const ry = Math.round(y * 100) / 100;
  const rrVal = Math.round(Math.max(0, r) * 100) / 100;
  const rs = Math.round(Math.max(0, smoothing) * 1000) / 1000;

  const key = `${rx}|${ry}|${rw}|${rh}|${rrVal}|${rs}`;
  const cached = squirclePathCache.get(key);
  if (cached !== undefined) {
    // Refresh recency
    squirclePathCache.delete(key);
    squirclePathCache.set(key, cached);
    return cached;
  }

  let out: string;
  if (rrVal <= 0) {
    out = `M${f3(rx)} ${f3(ry)}H${f3(rx + rw)}V${f3(ry + rh)}H${f3(rx)}Z`;
  } else {
    const params = computeSquircleParams(rw, rh, rrVal, rs);
    if (params.s <= 1e-4) {
      out = rr(rx, ry, rw, rh, params.r);
    } else {
      const { p } = params;
      out =
        `M${f3(rx + rw - p)} ${f3(ry)}` +
        squircleCornerCommands(rx + rw - p, ry, 1, 0, 0, 1, params, 1) +
        `L${f3(rx + rw)} ${f3(ry + rh - p)}` +
        squircleCornerCommands(rx + rw, ry + rh - p, 0, 1, -1, 0, params, 1) +
        `L${f3(rx + p)} ${f3(ry + rh)}` +
        squircleCornerCommands(rx + p, ry + rh, -1, 0, 0, -1, params, 1) +
        `L${f3(rx)} ${f3(ry + p)}` +
        squircleCornerCommands(rx, ry + p, 0, -1, 1, 0, params, 1) +
        `Z`;
    }
  }

  if (squirclePathCache.size >= SQUIRCLE_CACHE_LIMIT) {
    const oldest = squirclePathCache.keys().next().value;
    if (oldest !== undefined) squirclePathCache.delete(oldest);
  }
  squirclePathCache.set(key, out);
  return out;
}

/**
 * Generates left, right, and animated notch gap paths for floating-label fields
 * (`LabelInput` / `LabelSelect`) using 60% squircle corner curves.
 */
export function squircleNotchedRingPaths(
  W: number,
  H: number,
  r: number,
  IN: number,
  x0: number,
  x1: number,
  smoothing = SQ_DEFAULT_SMOOTHING,
): { gapL: string; gapR: string; right: string; left: string } {
  const iw = Math.max(1, W - 2 * IN);
  const ih = Math.max(1, H - 2 * IN);
  const ir = Math.max(0, r - IN);
  const R = IN + iw;
  const B = IN + ih;
  const mid = W / 2;

  const nm = (x0 + x1) / 2;
  const gapL = `M${f3(nm)} ${f3(IN)} L${f3(x0)} ${f3(IN)}`;
  const gapR = `M${f3(nm)} ${f3(IN)} L${f3(x1)} ${f3(IN)}`;

  if (ir <= 0) {
    return {
      gapL,
      gapR,
      right: `M${f3(x1)} ${f3(IN)} L${f3(R)} ${f3(IN)} L${f3(R)} ${f3(B)} L${f3(mid)} ${f3(B)}`,
      left: `M${f3(x0)} ${f3(IN)} L${f3(IN)} ${f3(IN)} L${f3(IN)} ${f3(B)} L${f3(mid)} ${f3(B)}`,
    };
  }

  const params = computeSquircleParams(iw, ih, ir, smoothing);
  const { p } = params;

  const trStartX = Math.max(x1, R - p);
  const right =
    `M${f3(x1)} ${f3(IN)}` +
    (trStartX > x1 ? `L${f3(trStartX)} ${f3(IN)}` : '') +
    squircleCornerCommands(R - p, IN, 1, 0, 0, 1, params, 1) +
    `L${f3(R)} ${f3(B - p)}` +
    squircleCornerCommands(R, B - p, 0, 1, -1, 0, params, 1) +
    `L${f3(mid)} ${f3(B)}`;

  // For the left path, keep x0 at least at IN + p - 2 (where vertical displacement < 0.03px) or clamp cleanly
  const tlJoinX = IN + p;
  const safeX0 = Math.min(x0, R - p);
  const left =
    (safeX0 > tlJoinX
      ? `M${f3(safeX0)} ${f3(IN)}L${f3(tlJoinX)} ${f3(IN)}`
      : `M${f3(Math.max(IN + 2, safeX0))} ${f3(IN)}`) +
    squircleCornerCommands(tlJoinX, IN, -1, 0, 0, 1, params, 0) +
    `L${f3(IN)} ${f3(B - p)}` +
    squircleCornerCommands(IN, B - p, 0, 1, 1, 0, params, 0) +
    `L${f3(mid)} ${f3(B)}`;

  return { gapL, gapR, right, left };
}

