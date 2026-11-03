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
