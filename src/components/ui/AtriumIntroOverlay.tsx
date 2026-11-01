import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    AtriumIntro?: {
      play: () => void;
      skip: () => void;
      seek: (t: number) => void;
    };
    ready?: boolean;
  }
}

interface AtriumIntroOverlayProps {
  onComplete?: () => void;
  forcePlay?: boolean;
}

export const AtriumIntroOverlay: React.FC<AtriumIntroOverlayProps> = ({
  onComplete,
  forcePlay = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);
  const fwbRef = useRef<SVGElement>(null);
  const sndRef = useRef<HTMLButtonElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);

  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (forcePlay) return true;
    if (typeof window === 'undefined') return false;
    try {
      const isAlreadySeen = sessionStorage.getItem('atrium-intro-seen') === '1';
      return !isAlreadySeen;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // If not visible and not forced, dispatch complete immediately and exit
    if (!forcePlay) {
      let skipOnce = false;
      try {
        const isOnceParam = /[?&]once=1/.test(window.location.search);
        const isAlreadySeen = sessionStorage.getItem('atrium-intro-seen') === '1';
        skipOnce = isAlreadySeen || (isOnceParam && isAlreadySeen);
      } catch {
        skipOnce = false;
      }

      if (skipOnce) {
        setIsVisible(false);
        try {
          document.dispatchEvent(new CustomEvent('atrium:introcomplete'));
        } catch {
          // fallback for environments without CustomEvent
        }
        onComplete?.();
        return;
      }
    }

    setIsVisible(true);

    const cv = canvasRef.current;
    const intro = containerRef.current;
    const grain = grainRef.current;
    const fwb = fwbRef.current;
    const snd = sndRef.current;
    const skip = skipRef.current;

    if (!cv || !intro || !grain || !fwb) {
      // Safety fail-open: never block the app
      try {
        sessionStorage.setItem('atrium-intro-seen', '1');
      } catch {}
      document.dispatchEvent(new CustomEvent('atrium:introcomplete'));
      onComplete?.();
      return;
    }

    const ctx = cv.getContext('2d');
    if (!ctx) {
      // Fallback if 2D context is unsupported
      try {
        sessionStorage.setItem('atrium-intro-seen', '1');
      } catch {}
      document.dispatchEvent(new CustomEvent('atrium:introcomplete'));
      onComplete?.();
      return;
    }

    let phase = 'idle';
    let t0 = 0;
    let raf = 0;
    let rz = 0;
    let curT = 0;
    let ac: AudioContext | null = null;
    let soundOn = false;

    // Safety timeout to ensure intro never hangs or locks the UI forever
    const safetyTimeout = window.setTimeout(() => {
      if (phase === 'run') {
        finish();
      }
    }, 7000);

    // ==========================================
    // EXACT ATRIUM CONFLUENCE ANIMATION LOGIC
    // (Do not alter animation math, paths or timings)
    // ==========================================
    const GL: Record<string, { d: string; x0: number; x1: number }> = {
      A: {
        d: 'M64.0 0.0V-539.0H90.0V0.0H154.0V-770.0C154.0 -812.0 119.0 -847.0 77.0 -847.0C35.0 -847.0 0.0 -812.0 0.0 -770.0V0.0ZM64.0 -757.0C64.0 -764.0 70.0 -770.0 77.0 -770.0C84.0 -770.0 90.0 -764.0 90.0 -757.0V-616.0H64.0Z',
        x0: 0,
        x1: 154,
      },
      T: {
        d: 'M0.0 -770.0H45.0V0.0H109.0V-770.0H154.0V-847.0H0.0Z',
        x0: 0,
        x1: 154,
      },
      R: {
        d: 'M0.0 0.0H64.0V-539.0H77.0C84.0 -539.0 90.0 -533.0 90.0 -526.0V0.0H154.0V-540.0C154.0 -561.0 137.0 -578.0 116.0 -578.0C137.0 -578.0 154.0 -595.0 154.0 -615.0V-770.0C154.0 -812.0 119.0 -847.0 77.0 -847.0H0.0ZM64.0 -769.0H77.0C84.0 -769.0 90.0 -764.0 90.0 -757.0V-628.0C90.0 -621.0 84.0 -616.0 77.0 -616.0H64.0Z',
        x0: 0,
        x1: 154,
      },
      I: {
        d: 'M77.0 -847.0H0.0V0.0H77.0Z',
        x0: 0,
        x1: 77,
      },
      U: {
        d: 'M0.0 -77.0C0.0 -34.0 34.0 0.0 77.0 0.0C119.0 0.0 154.0 -34.0 154.0 -77.0V-847.0H90.0V-90.0C90.0 -83.0 84.0 -77.0 77.0 -77.0C70.0 -77.0 64.0 -83.0 64.0 -90.0V-847.0H0.0Z',
        x0: 0,
        x1: 154,
      },
      M: {
        d: 'M64.0 0.0V-770.0H90.0V0.0H143.0V-770.0H155.0C162.0 -770.0 168.0 -764.0 168.0 -757.0V0.0H232.0V-770.0C232.0 -812.0 198.0 -847.0 155.0 -847.0H0.0V0.0Z',
        x0: 0,
        x1: 232,
      },
    };

    const T = '#D3542E',
      K = '#F1E8DD',
      B = '#0A0A0A',
      G = '#E9A23B',
      W = '#FFFFFF';
    const PHI = 1.618034,
      M = 847,
      STEM = 77,
      c3 = M / Math.pow(PHI, 3),
      RC = STEM / Math.pow(PHI, 2),
      RO = M / Math.pow(PHI, 6),
      GAP = STEM / PHI,
      END = 5.4,
      cs0 = M - 2 * c3 - STEM;

    const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const ease = (u: number, k: number) => {
      u = clamp(u);
      return (1 - Math.exp(-k * u)) / (1 - Math.exp(-k));
    };
    const eIn = (u: number, k: number) => {
      u = clamp(u);
      return (Math.exp(k * u) - 1) / (Math.exp(k) - 1);
    };
    const spr = (u: number, w: number) => {
      u = clamp(u);
      const f = (x: number) => 1 - (1 + w * x) * Math.exp(-w * x);
      return f(u) / f(1);
    };
    const sm = (x: number) => {
      x = clamp(x);
      return x * x * (3 - 2 * x);
    };
    const eio3 = (u: number) => {
      u = clamp(u);
      return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    };
    const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const mixc = (a: string, b: string, t: number) => {
      const A = hex(a),
        C = hex(b);
      return `rgb(${A.map((v, i) => Math.round(lerp(v, C[i], clamp(t)))).join()})`;
    };
    const RNG = (s: number) => () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };

    // ---------- word ----------
    const ADJ: Record<string, number> = { AT: -18, TR: -18 };
    let xx = 0;
    let pv: string | null = null;
    const items: Array<{
      ch: string;
      w: number;
      g: { d: string; x0: number; x1: number };
      p: Path2D;
    }> = [];
    const gapU: number[] = [];

    for (const ch of 'ATRIUM') {
      const g = GL[ch];
      let gp = 0;
      if (pv !== null) {
        gp = GAP + (ADJ[pv + ch] || 0);
        xx += gp;
        gapU.push(gp);
      }
      items.push({ ch, w: g.x1 - g.x0, g, p: new Path2D(g.d) });
      xx += g.x1 - g.x0;
      pv = ch;
    }
    const WW = xx,
      X0 = M + STEM * PHI,
      LW = X0 + WW,
      SUMW = items.reduce((a, b) => a + b.w, 0);
    const ZN = [
      [[0.3, 0.7]],
      [
        [0, 0.33],
        [0.67, 1],
      ],
      [[0.3, 0.75]],
      [],
      [[0.3, 0.7]],
      [
        [0.22, 0.42],
        [0.58, 0.78],
      ],
    ];

    // ---------- symbols (wordless, built from the logo's own shapes) ----------
    type Prim = [string, number, number, number, ...any[]];
    const r_ = (x: number, y: number, w: number, h: number, rd: number, c: string): Prim => [
      'r',
      x,
      y,
      w,
      h,
      rd,
      c,
    ];
    const c_ = (x: number, y: number, r: number, c: string): Prim => ['c', x, y, r, c];
    const SY: Array<{ b: string | null; g: number; d: Prim[]; m?: number }> = [
      {
        b: T,
        g: 0,
        d: [
          r_(-0.07, -0.28, 0.14, 0.56, 0.04, K),
          r_(-0.28, -0.07, 0.56, 0.14, 0.04, K),
        ],
      },
      {
        b: B,
        g: 0,
        d: [
          r_(-0.32, -0.2, 0.64, 0.4, 0.07, K),
          c_(-0.17, -0.02, 0.07, B),
          r_(-0.02, -0.07, 0.22, 0.05, 0.02, B),
          r_(-0.02, 0.03, 0.16, 0.05, 0.02, B),
        ],
      },
      {
        b: K,
        g: 0,
        d: [
          r_(-0.32, -0.32, 0.64, 0.17, 0.04, T),
          c_(-0.18, -0.36, 0.04, B),
          c_(0.18, -0.36, 0.04, B),
          r_(-0.28, -0.06, 0.17, 0.17, 0.03, B),
          r_(-0.05, -0.06, 0.17, 0.17, 0.03, B),
          r_(-0.28, 0.17, 0.17, 0.12, 0.03, B),
        ],
      },
      {
        b: G,
        g: 1,
        d: [
          r_(-0.03, -0.05, 0.06, 0.36, 0.02, B),
          c_(-0.13, -0.14, 0.11, B),
          c_(0.14, -0.22, 0.11, B),
        ],
      },
      {
        b: B,
        g: 1,
        d: [
          r_(-0.3, -0.3, 0.6, 0.05, 0.02, K),
          r_(-0.3, -0.3, 0.05, 0.6, 0.02, K),
          r_(-0.3, 0.25, 0.6, 0.05, 0.02, K),
          r_(0.25, -0.3, 0.05, 0.3, 0.02, K),
        ],
      },
      {
        b: K,
        g: 1,
        d: [
          r_(-0.28, 0.02, 0.24, 0.24, 0.04, B),
          r_(0.04, 0.02, 0.24, 0.24, 0.04, B),
          r_(-0.12, -0.28, 0.24, 0.24, 0.04, B),
        ],
      },
      {
        b: B,
        g: 2,
        d: [
          r_(-0.3, -0.25, 0.05, 0.5, 0, K),
          r_(-0.2, -0.25, 0.1, 0.5, 0, K),
          r_(-0.05, -0.25, 0.04, 0.5, 0, K),
          r_(0.04, -0.25, 0.09, 0.5, 0, K),
          r_(0.2, -0.25, 0.05, 0.5, 0, K),
        ],
      },
      {
        b: K,
        g: 2,
        d: [c_(0, 0, 0.3, T), c_(0, 0, 0.19, K), c_(0, 0, 0.08, T)],
      },
      {
        b: G,
        g: 2,
        d: [
          r_(-0.3, -0.15, 0.36, 0.36, 0.05, B),
          r_(-0.06, -0.22, 0.36, 0.36, 0.05, K),
        ],
      },
      {
        b: T,
        g: 3,
        d: [
          r_(-0.3, -0.22, 0.6, 0.05, 0.02, K),
          r_(-0.025, -0.22, 0.05, 0.5, 0.02, K),
          c_(-0.22, 0.04, 0.1, K),
          c_(0.22, 0.04, 0.1, K),
        ],
      },
      {
        b: K,
        g: 3,
        d: [c_(-0.06, -0.1, 0.17, T), r_(0.04, 0.12, 0.28, 0.06, 0.03, B)],
      },
      { b: null, g: 3, d: [] },
    ];

    // ---------- world simulation (fixed step, seeded, resolution independent) ----------
    const DT = 1 / 120,
      TS = 2.5,
      NS = Math.ceil(TS / DT) + 2,
      SZ = 0.085,
      MS = 0.34,
      CCOFF = ((M / 2 - c3 / 2) / M) * MS,
      CCSZ = (c3 / M) * MS,
      RR = (((cs0 + STEM) / M) * MS) / 2;
    const DIR = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    const SYP = new Float32Array(NS * 24);
    const DET: Array<{ s: number; p: Prim; k: number }> = [];
    SY.forEach((s, i) => s.d.forEach((p, k) => DET.push({ s: i, p, k })));
    const ND = DET.length;
    const DP = new Float32Array(NS * ND * 2);
    const TSH: number[] = [];
    {
      const rnd = RNG(5);
      const P: Array<[number, number]> = [];
      const V: Array<[number, number]> = [];
      const mem = [0, 0, 0, 0];
      SY.forEach((s, i) => {
        const cx_ = -0.36 + (i % 4) * 0.24 + (rnd() - 0.5) * 0.07;
        const cy_ = -0.15 + ((i / 4) | 0) * 0.15 + (rnd() - 0.5) * 0.05;
        P.push([cx_, cy_]);
        V.push([(rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.1]);
        s.m = mem[s.g]++;
      });
      const dp = DET.map(() => [0, 0]);
      const dv = DET.map(() => [0, 0]);
      DET.forEach(() => TSH.push(1.95 + rnd() * 0.3));
      const kick = DET.map(() => {
        const a = rnd() * 6.283;
        return [Math.cos(a) * 0.12, Math.sin(a) * 0.12];
      });
      const OFF = [
        [-0.03, 0.02],
        [0.03, 0.02],
        [0, -0.03],
      ];
      for (let n = 0; n < NS; n++) {
        const t = n * DT;
        for (let i = 0; i < 12; i++) {
          SYP[n * 24 + i * 2] = P[i][0];
          SYP[n * 24 + i * 2 + 1] = P[i][1];
        }
        DET.forEach((d, k) => {
          let x: number, y: number;
          if (t < TSH[k]) {
            const o =
              d.p[0] === 'c'
                ? [d.p[1], d.p[2]]
                : [d.p[1] + d.p[3] / 2, d.p[2] + d.p[4] / 2];
            x = P[d.s][0] + o[0] * SZ;
            y = P[d.s][1] + o[1] * SZ;
            dp[k] = [x, y];
            dv[k] = [V[d.s][0] + kick[k][0], V[d.s][1] + kick[k][1]];
          } else {
            x = dp[k][0];
            y = dp[k][1];
          }
          DP[n * ND * 2 + k * 2] = x;
          DP[n * ND * 2 + k * 2 + 1] = y;
        });
        const rs = sm((t - 1.5) / 0.5),
          kS = 0.8 * rs,
          kT = 0.18 * rs;
        for (let i = 0; i < 12; i++) {
          let ax = 0,
            ay = 0;
          const p = P[i],
            v = V[i];
          if (rs < 1) {
            let cxn = 0,
              cyn = 0,
              vxn = 0,
              vyn = 0,
              nn = 0;
            for (let j = 0; j < 12; j++) {
              if (j === i) continue;
              const dx = p[0] - P[j][0],
                dy = p[1] - P[j][1],
                r = Math.hypot(dx, dy) + 1e-6;
              if (r < 0.13) {
                const f = (0.13 - r) * 5;
                ax += (dx / r) * f;
                ay += (dy / r) * f;
              }
              if (r < 0.32) {
                cxn += P[j][0];
                cyn += P[j][1];
                vxn += V[j][0];
                vyn += V[j][1];
                nn++;
              }
            }
            if (nn) {
              ax += (cxn / nn - p[0]) * 0.7 + (vxn / nn - v[0]) * 0.8;
              ay += (cyn / nn - p[1]) * 0.7 + (vyn / nn - v[1]) * 0.8;
            }
            ax +=
              -p[0] * 0.9 + 0.06 * Math.sin(5.1 * p[1] + 0.9 * t + i);
            ay +=
              -p[1] * 1.4 + 0.06 * Math.cos(4.3 * p[0] + 0.7 * t + i * 1.3);
            const sp = Math.hypot(v[0], v[1]);
            if (sp > 0.16) {
              ax -= v[0] * (sp - 0.16) * 8;
              ay -= v[1] * (sp - 0.16) * 8;
            }
          }
          if (rs > 0) {
            const rl = Math.hypot(p[0], p[1]) + 1e-6,
              rx = p[0] / rl,
              ry = p[1] / rl;
            ax += -rx * kS * 0.9 + -ry * kT * (0.4 / (rl + 0.1));
            ay += -ry * kS * 0.9 + rx * kT * (0.4 / (rl + 0.1));
          }
          ax -= v[0] * (0.5 + 2.5 * rs);
          ay -= v[1] * (0.5 + 2.5 * rs);
          const tg = clamp((t - 2.0) / 0.25);
          if (tg > 0) {
            const s = SY[i],
              fu = ease((t - 2.15) / 0.2, 4),
              tx = DIR[s.g][0] * CCOFF + OFF[s.m!][0] * (1 - fu),
              ty = DIR[s.g][1] * CCOFF + OFF[s.m!][1] * (1 - fu);
            ax += (tx - p[0]) * 70 * tg - v[0] * 13 * tg;
            ay += (ty - p[1]) * 70 * tg - v[1] * 13 * tg;
          }
          V[i][0] += ax * DT;
          V[i][1] += ay * DT;
        }
        for (let i = 0; i < 12; i++) {
          P[i][0] += V[i][0] * DT;
          P[i][1] += V[i][1] * DT;
        }
        DET.forEach((d, k) => {
          if (t < TSH[k]) return;
          const p = dp[k],
            v = dv[k],
            rl = Math.hypot(p[0], p[1]) + 1e-6,
            rx = p[0] / rl,
            ry = p[1] / rl,
            rg = clamp((t - 2.1) / 0.2);
          const rad = -(rl - RR) * 55 * rg;
          let ax = -rx * kS * 1.3 - ry * kT * (0.4 / (rl + 0.1));
          let ay = -ry * kS * 1.3 + rx * kT * (0.4 / (rl + 0.1));
          ax += rx * rad;
          ay += ry * rad;
          const dr = 1.2 + 7 * rg;
          ax -= v[0] * dr;
          ay -= v[1] * dr;
          v[0] += ax * DT;
          v[1] += ay * DT;
          p[0] += v[0] * DT;
          p[1] += v[1] * DT;
        });
      }
    }
    const samp = (
      arr: Float32Array,
      stride: number,
      n: number,
      idx: number,
      fr: number
    ) => arr[n * stride + idx] * (1 - fr) + arr[(n + 1) * stride + idx] * fr;

    // ---------- letter vessels (connected tanks with inertia) ----------
    const VT0 = 3.0,
      VN = Math.ceil((END - VT0) * 240) + 2,
      DROPS = [
        [3.5, 4, 0.95],
        [3.82, 2, 0.8],
        [4.1, 0, 0.65],
      ] as const,
      VS: number[][] = [];
    {
      const g = 170,
        c = 9,
        h = 1 / 240,
        L = new Array(6).fill(0),
        F = new Array(5).fill(0);
      for (let n = 0; n < VN; n++) {
        VS.push(L.slice());
        const t = VT0 + n * h;
        for (const [td, k, vol] of DROPS) {
          const u = (t - (td - 0.24)) / 0.24;
          if (u > 0 && u < 1) {
            const amt = ((vol * 2 * Math.pow(Math.sin((Math.PI * u) / 2), 2) * h) / 0.24);
            L[k] += amt;
            let ws = 0;
            for (let j = 0; j < 6; j++) {
              if (j !== k) ws += 1 / ((j - k) * (j - k));
            }
            for (let j = 0; j < 6; j++) {
              if (j !== k) L[j] -= amt * (1 / ((j - k) * (j - k))) / ws;
            }
          }
        }
        for (let i = 0; i < 5; i++) F[i] += (g * (L[i] - L[i + 1]) - c * F[i]) * h;
        for (let i = 0; i < 5; i++) {
          L[i] -= F[i] * h;
          L[i + 1] += F[i] * h;
        }
      }
    }
    function tanks(t: number) {
      const o = new Array(6).fill(0);
      if (t < VT0) return o;
      const f = (t - VT0) * 240,
        i0 = Math.min(VN - 1, Math.floor(f)),
        i1 = Math.min(VN - 1, i0 + 1),
        fr = f - i0,
        env = 1 - sm((t - 4.5) / 0.3);
      for (let i = 0; i < 6; i++) o[i] = lerp(VS[i0][i], VS[i1][i], fr) * env;
      return o;
    }
    function widths(t: number) {
      const L = tanks(t),
        w = items.map((it, i) => Math.max(0.42 * it.w, it.w + 154 * L[i])),
        s = SUMW / w.reduce((a, b) => a + b, 0);
      return w.map((v) => v * s);
    }

    // ---------- layout ----------
    let vw: number,
      vh: number,
      dpr: number,
      cx: number,
      cy: number,
      sc: number,
      Lw: number,
      k0: number,
      Hh: number,
      ox: number,
      oy: number,
      by: number,
      cx0: number,
      WU: number,
      mk1: number,
      wl0: number,
      wl1: number;

    function layout() {
      vw = window.innerWidth;
      vh = window.innerHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv!.width = Math.round(vw * dpr);
      cv!.height = Math.round(vh * dpr);
      cx = vw / 2;
      cy = vh / 2;
      sc = Math.min(vw, vh) / 1080;
      const asp = vw / vh;
      Lw = Math.min(vw * (asp > 1.25 ? 0.46 : 0.8), 1100);
      k0 = Lw / LW;
      Hh = M * k0;
      ox = cx - Lw / 2;
      oy = cy - Hh / 2;
      by = oy + Hh;
      cx0 = ox + (M / 2) * k0;
      mk1 = Math.min(Lw * 0.62, Math.min(vw, vh) * 0.6);
      WU = Math.min(mk1 / MS, vw * 0.92, (vh * 0.92) / 0.56);
      wl0 = cx - (WW * k0) / 2;
      wl1 = ox + X0 * k0;
    }

    // ---------- drawing helpers ----------
    function rr(x: number, y: number, w: number, h: number, r: number) {
      ctx!.beginPath();
      ctx!.roundRect(
        x,
        y,
        Math.max(0, w),
        Math.max(0, h),
        Math.max(0, Math.min(r, Math.min(w, h) / 2))
      );
    }
    function noisePoly(
      x0: number,
      y0: number,
      R: number,
      n: number,
      ph: number,
      a1: number,
      a2: number
    ) {
      ctx!.beginPath();
      for (let j = 0; j < n; j++) {
        const th = (j / n) * 6.2832,
          r =
            R *
            (1 +
              a1 * Math.sin(5 * th + ph * 4) +
              a2 * Math.sin(9 * th - ph * 6 + 1) +
              0.03 * Math.sin(14 * th + ph * 8)),
          x = x0 + Math.cos(th) * r,
          y = y0 + Math.sin(th) * r;
        j ? ctx!.lineTo(x, y) : ctx!.moveTo(x, y);
      }
      ctx!.closePath();
    }
    function drawPrim(p: Prim, X: number, Y: number, S: number, sz: number) {
      ctx!.fillStyle = p[p.length - 1];
      if (p[0] === 'c') {
        ctx!.beginPath();
        ctx!.arc(X + p[1] * S, Y + p[2] * S, Math.max(0, p[3] * S * sz), 0, 6.2832);
        ctx!.fill();
      } else {
        const w = p[3] * S * sz,
          h = p[4] * S * sz,
          cxp = X + (p[1] + p[3] / 2) * S,
          cyp = Y + (p[2] + p[4] / 2) * S;
        rr(cxp - w / 2, cyp - h / 2, w, h, p[5] * S * sz);
        ctx!.fill();
      }
    }
    function drawMark(
      X: number,
      Y: number,
      s: number,
      P: { dist: number[]; arc: number[]; dip: number[]; col: string; rot: number; rs: number }
    ) {
      ctx!.save();
      ctx!.translate(X, Y);
      ctx!.scale(s, s);
      ctx!.translate(-M / 2, -M / 2);
      for (let i = 0; i < 4; i++) {
        const cx_ = (i & 1) * (M - c3) + c3 / 2,
          cy_ = (i >> 1) * (M - c3) + c3 / 2,
          d = P.dist[i],
          ar = P.arc[i];
        ctx!.save();
        ctx!.translate(
          DIR[i][0] * d - DIR[i][1] * ar,
          DIR[i][1] * d + DIR[i][0] * ar
        );
        ctx!.translate(cx_, cy_);
        ctx!.scale(P.dip[i], P.dip[i]);
        ctx!.translate(-cx_, -cy_);
        ctx!.fillStyle = P.col;
        rr((i & 1) * (M - c3), (i >> 1) * (M - c3), c3, c3, RC);
        ctx!.fill();
        ctx!.restore();
      }
      ctx!.translate(M / 2, M / 2);
      ctx!.rotate((P.rot * Math.PI) / 180);
      ctx!.scale(Math.max(P.rs, 1e-4), Math.max(P.rs, 1e-4));
      ctx!.strokeStyle = P.col;
      ctx!.lineWidth = STEM;
      rr(-cs0 / 2, -cs0 / 2, cs0, cs0, RO - STEM / 2);
      ctx!.stroke();
      ctx!.restore();
    }
    const dipF = (tau: number) =>
      tau <= 0 ? 1 : 1 - 0.2 * Math.exp(-10 * tau) * (1 - Math.exp(-60 * tau));

    function drawLetter(
      i: number,
      x: number,
      wU: number,
      hs: number,
      col: string,
      ox_: number,
      oy_: number
    ) {
      const it = items[i],
        w = it.w,
        Sx = wU / w,
        Z = ZN[i],
        Zf = Z.reduce((a, z) => a + z[1] - z[0], 0),
        g = it.g;
      ctx!.fillStyle = col;
      if (Sx < 1 || !Z.length) {
        const f = Z.length ? Sx : Math.min(Sx, 1),
          sx = x + (Z.length ? 0 : ((wU - w * f) * k0) / 2);
        ctx!.save();
        ctx!.translate(sx + ox_, by + oy_);
        ctx!.scale(k0 * f, k0 * hs);
        ctx!.translate(-g.x0, 0);
        ctx!.fill(it.p);
        ctx!.restore();
        return;
      }
      const Sz = (Sx - (1 - Zf)) / Zf,
        segs: Array<[number, number, boolean]> = [];
      let cur = 0;
      for (const z of Z) {
        if (z[0] > cur) segs.push([cur, z[0], false]);
        segs.push([z[0], z[1], true]);
        cur = z[1];
      }
      if (cur < 1) segs.push([cur, 1, false]);
      let D = x;
      segs.forEach((s, n) => {
        const a = s[0] * w,
          b = s[1] * w,
          f = s[2] ? Sz : 1,
          wd = (b - a) * k0 * f;
        ctx!.save();
        ctx!.beginPath();
        ctx!.rect(
          D - (n ? 0.6 : 3) + ox_,
          by - Hh * 1.5 + oy_,
          wd + (n < segs.length - 1 ? 1.2 : 3) + (n ? 0 : 0.6),
          Hh * 2
        );
        ctx!.clip();
        ctx!.translate(D - a * k0 * f + ox_, by + oy_);
        ctx!.scale(k0 * f, k0 * hs);
        ctx!.translate(-g.x0, 0);
        ctx!.fill(it.p);
        ctx!.restore();
        D += wd;
      });
    }

    // ---------- render ----------
    function render(t: number) {
      t = clamp(t, 0, END);
      curT = t;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const flood = t >= 2.45 && t < 3.0,
        orange = t >= 3.0,
        dgn = Math.hypot(vw, vh);
      ctx!.fillStyle = orange ? T : W;
      ctx!.fillRect(0, 0, vw, vh);
      const wU = widths(t),
        hs = wU.map((v, i) => clamp(1 - 0.12 * (v / items[i].w - 1), 0.9, 1.08));

      // flow lines
      const N = vh < 520 ? 16 : 30,
        rs = sm((t - 1.5) / 0.5),
        swirl = 2.6 * rs * (1 - sm((t - 2.45) / 0.5)),
        calm = 1 - sm((t - 4.5) / 0.5);
      const camS =
        t < 2.45
          ? 1 + (0.04 * t) / 2.45
          : 1.04 * Math.exp(Math.log(14) * eIn((t - 2.45) / 0.55, 4));

      function lines(col: string, react: boolean) {
        ctx!.strokeStyle = col;
        ctx!.lineWidth = Math.max(1, 1.3 * sc);
        for (let j = 0; j < N; j++) {
          const y0 = ((j + 0.5) / N) * vh;
          ctx!.beginPath();
          for (let s = 0; s <= 56; s++) {
            const x0 = -0.05 * vw + (s / 56) * 1.1 * vw;
            let x = x0,
              y = y0 + 10 * sc * calm * Math.sin(x0 / (110 * sc) - 0.9 * t + j * 0.5);
            if (swirl > 0) {
              const dx = x - cx,
                dy = y - cy,
                r = Math.hypot(dx, dy),
                a = swirl * Math.exp(-Math.pow(r / (0.4 * WU), 2)),
                ca = Math.cos(a),
                sa = Math.sin(a);
              x = cx + dx * ca - dy * sa;
              y = cy + dx * sa + dy * ca;
            }
            if (react) {
              const acc = wl0 + (t >= 4.45 ? (wl1 - wl0) * spr((t - 4.45) / 0.55, 7) : 0);
              const sg = y0 < cy ? -1 : 1;
              let X = acc;
              for (let i = 0; i < 6; i++) {
                const wp = wU[i] * k0,
                  mid = X + wp / 2,
                  S_ = wU[i] / items[i].w - 1;
                y +=
                  sg *
                  0.3 *
                  Hh *
                  clamp(S_, -0.6, 1) *
                  Math.exp(-Math.pow((x - mid) / (0.8 * wp + 20 * sc), 2)) *
                  calm;
                X += wp + (i < 5 ? gapU[i] * k0 : 0);
              }
            }
            s ? ctx!.lineTo(x, y) : ctx!.moveTo(x, y);
          }
          ctx!.stroke();
        }
      }

      if (!orange) {
        lines('rgba(211,84,46,0.16)', false);
      }
      // flood
      if (flood) {
        const R = lerp(0, 1.35 * dgn, eio3((t - 2.45) / 0.55));
        ctx!.fillStyle = T;
        noisePoly(cx, cy, R, 96, t, 0.07, 0.05);
        ctx!.fill();
      }
      if (flood) {
        ctx!.save();
        noisePoly(
          cx,
          cy,
          lerp(0, 1.35 * dgn, eio3((t - 2.45) / 0.55)),
          96,
          t,
          0.07,
          0.05
        );
        ctx!.clip();
        lines('rgba(241,232,221,0.22)', true);
        ctx!.restore();
      }
      if (orange) lines('rgba(241,232,221,0.22)', true);

      // whip blur
      const wsd =
        Math.max(1, sc * 30) *
        Math.pow(Math.sin(Math.PI * clamp((t - 2.55) / 0.45)), 2);
      if (wsd > 0.6) {
        fwb!.setAttribute('stdDeviation', wsd.toFixed(2) + ' 0');
        cv!.style.filter = 'url(#fw)';
      } else {
        cv!.style.filter = 'none';
      }

      // ---- scene 1 world ----
      if (t < 3.05) {
        ctx!.save();
        ctx!.translate(cx, cy);
        ctx!.scale(camS, camS);
        ctx!.translate(-cx, -cy);
        const n = Math.min(NS - 2, Math.floor(t / DT)),
          fr = t / DT - n,
          ts = Math.min(t, TS - 0.05);
        const fu = ease((t - 2.15) / 0.2, 4),
          absorb = ease((t - 2.28) / 0.14, 3);
        SY.forEach((s, i) => {
          const x = cx + samp(SYP, 24, Math.min(n, NS - 2), i * 2, fr) * WU,
            y = cy + samp(SYP, 24, Math.min(n, NS - 2), i * 2 + 1, fr) * WU,
            sz = lerp(SZ, CCSZ, fu) * WU;
          if (s.b === null) {
            ctx!.setLineDash([sz * 0.22, sz * 0.16 * (1 - fu)]);
            ctx!.strokeStyle = B;
            ctx!.lineWidth = Math.max(1, 2 * sc);
            rr(x - sz / 2, y - sz / 2, sz, sz, sz * 0.22);
            ctx!.stroke();
            ctx!.setLineDash([]);
            if (fu > 0) {
              ctx!.fillStyle = T;
              rr(x - (sz * fu) / 2, y - (sz * fu) / 2, sz * fu, sz * fu, sz * 0.22);
              ctx!.fill();
            }
          } else {
            ctx!.fillStyle = mixc(s.b, T, fu);
            rr(x - sz / 2, y - sz / 2, sz, sz, sz * 0.22);
            ctx!.fill();
            if (fu < 1) {
              ctx!.strokeStyle = B;
              ctx!.lineWidth = Math.max(0, Math.max(1, 2 * sc) * (1 - fu));
              ctx!.stroke();
            }
          }
        });
        DET.forEach((d, k) => {
          const sh = ts >= TSH[k];
          const X = cx + samp(DP, ND * 2, Math.min(n, NS - 2), k * 2, fr) * WU,
            Y = cy + samp(DP, ND * 2, Math.min(n, NS - 2), k * 2 + 1, fr) * WU;
          const S_ = SZ * WU;
          if (!sh) {
            const s = SY[d.s];
            if (s.b === null) return;
            drawPrim(
              d.p,
              cx + samp(SYP, 24, Math.min(n, NS - 2), d.s * 2, fr) * WU - 0,
              cy + samp(SYP, 24, Math.min(n, NS - 2), d.s * 2 + 1, fr) * WU,
              S_,
              1
            );
            return;
          }
          const a = 1 - absorb;
          if (a <= 0.01) return;
          const p = d.p,
            w_ = p[0] === 'c' ? p[3] * 2 : p[3],
            h_ = p[0] === 'c' ? p[3] * 2 : p[4];
          ctx!.fillStyle = p[p.length - 1] === K ? T : p[p.length - 1];
          const q = Math.max(0.2, Math.min(w_, h_)) * S_ * a;
          rr(X - q / 2, Y - q / 2, q, q, q * 0.3);
          ctx!.fill();
        });
        // ring grows out of the debris, then spins down
        const ringW = (absorb * STEM) / M * MS * WU;
        if (ringW > 0.3) {
          const sz = (cs0 / M) * MS * WU,
            rot = 200 * ease((t - 2.3) / 0.6, 4);
          ctx!.save();
          ctx!.translate(cx, cy);
          ctx!.rotate((rot * Math.PI) / 180);
          ctx!.strokeStyle = B;
          ctx!.lineWidth = ringW;
          rr(-sz / 2, -sz / 2, sz, sz, ((RO - STEM / 2) / M) * MS * WU);
          ctx!.stroke();
          ctx!.restore();
        }
        ctx!.restore();
      }

      // ---- word, drops ----
      const cam2 =
        t < 4.45
          ? lerp(1, 1.06, eio3((t - 3) / 1.45))
          : lerp(1.06, 1, ease((t - 4.45) / 0.95, 4));
      if (t >= 3.0) {
        ctx!.save();
        ctx!.translate(cx, cy);
        ctx!.scale(cam2, cam2);
        ctx!.translate(-cx, -cy);
        const esl = spr((t - 4.45) / 0.55, 7);
        let x = lerp(wl0, wl1, esl);
        items.forEach((it, i) => {
          if (i) x += gapU[i - 1] * k0;
          const wpx = wU[i] * k0,
            tR = 3.0 + 0.06 * i,
            e = ease((t - tR) / 0.3, 5);
          let h = hs[i];
          for (const [td, k] of DROPS) {
            if (k === i) {
              h *=
                dipF(t - td) * 0 +
                (1 - 0.06 * Math.exp(-9 * Math.max(0, t - td)) * (t >= td ? 1 : 0));
            }
          }
          if (t >= tR) {
            const dx = (cx - (x + wpx / 2)) * 0.5 * (1 - e) * (1 - esl),
              zf = 1 + 0.1 * (1 - e),
              br = Math.max(1, sc * 14) * (1 - e);
            if (br > 0.8) {
              for (let s = 0; s < 8; s++) {
                const a = (s / 8) * 6.2832;
                ctx!.globalAlpha = 0.16;
                drawLetter(
                  i,
                  x + dx,
                  wU[i],
                  h * zf,
                  B,
                  Math.cos(a) * br,
                  Math.sin(a) * br
                );
              }
              ctx!.globalAlpha = 1;
            } else {
              drawLetter(i, x + dx, wU[i], h, B, 0, 0);
            }
          }
          x += wpx;
        });

        // drops + capillary rings
        DROPS.forEach(([td, k, vol]) => {
          let xs = lerp(wl0, wl1, esl);
          for (let i = 0; i < k; i++) xs += wU[i] * k0 + gapU[i] * k0;
          const mx = xs + (wU[k] * k0) / 2,
            top = by - Hh * hs[k];
          const t0_ = td - 0.4;
          if (t > t0_ && t < td) {
            const u = (t - t0_) / 0.4,
              y = lerp(-0.1 * vh, top, u * u),
              r = Math.max(3, sc * (9 + vol * 8));
            ctx!.fillStyle = G;
            ctx!.beginPath();
            ctx!.ellipse(mx, y, r, r * (1 + 0.9 * u), 0, 0, 6.2832);
            ctx!.fill();
          }
          const a = t - td;
          if (a > 0 && a < 0.55) {
            for (let q = 0; q < 2; q++) {
              const aq = a - q * 0.09;
              if (aq <= 0) continue;
              ctx!.strokeStyle = K;
              ctx!.lineWidth = Math.max(1, sc * lerp(4, 0.8, aq / 0.5));
              ctx!.beginPath();
              ctx!.ellipse(
                mx,
                top,
                sc * (30 + 380 * aq) * (0.6 + vol * 0.4),
                sc * (8 + 60 * aq),
                0,
                0,
                6.2832
              );
              ctx!.stroke();
            }
          }
        });

        // final mark: cubes fall in, ring blooms
        if (t >= 4.4) {
          const d0 = (Math.max(vw, vh) * 0.9) / k0,
            P = {
              dist: [] as number[],
              arc: [] as number[],
              dip: [] as number[],
              col: B,
              rot: -90 * (1 - ease((t - 4.75) / 0.4, 6)),
              rs: spr((t - 4.75) / 0.35, 8),
            };
          for (let i = 0; i < 4; i++) {
            const u = eIn((t - 4.4 - 0.04 * i) / 0.5, 2);
            P.dist.push(d0 * (1 - u));
            P.arc.push(0.3 * d0 * Math.sin(Math.PI * u) * (1 - u));
            P.dip.push(dipF(t - (4.9 + 0.04 * i)));
          }
          drawMark(cx0, cy, k0, P);
        }
        ctx!.restore();
      }

      grain!.style.backgroundPosition =
        ((Math.floor(t * 24) * 37) % 128) +
        'px ' +
        ((Math.floor(t * 24) * 61) % 128) +
        'px';
    }

    // Grain texture generator
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const x = c.getContext('2d');
      if (x) {
        const d = x.createImageData(128, 128);
        let sd = 11;
        for (let i = 0; i < d.data.length; i += 4) {
          sd = (sd * 1664525 + 1013904223) >>> 0;
          const v = sd >>> 24;
          d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
          d.data[i + 3] = 255;
        }
        x.putImageData(d, 0, 0);
        grain.style.backgroundImage = 'url(' + c.toDataURL() + ')';
      }
    } catch {}

    // ---------- sound (optional, derived from the same simulation) ----------
    function schedule(t0_: number) {
      if (!ac || !soundOn) return;
      const now = ac.currentTime,
        at = (u: number) => now + (u - t0_);
      const env = (g: GainNode, t: number, pk: number, dec: number) => {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(pk, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      };
      const tone = (u: number, f: number, pk: number, dec: number, f2?: number) => {
        if (u < t0_ || !ac) return;
        const o = ac.createOscillator(),
          g = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, at(u));
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, at(u) + dec);
        env(g, at(u), pk, dec);
        o.connect(g);
        g.connect(ac.destination);
        o.start(at(u));
        o.stop(at(u) + dec + 0.05);
      };
      const noise = (u: number, dur: number, f: number, f2: number, pk: number) => {
        if (u + dur < t0_ || !ac) return;
        const b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate),
          d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const s = ac.createBufferSource(),
          fl = ac.createBiquadFilter(),
          g = ac.createGain();
        s.buffer = b;
        fl.type = 'bandpass';
        fl.frequency.setValueAtTime(f, at(u));
        fl.frequency.exponentialRampToValueAtTime(f2, at(u) + dur);
        g.gain.setValueAtTime(0.0001, at(u));
        g.gain.linearRampToValueAtTime(pk, at(u) + dur * 0.5);
        g.gain.exponentialRampToValueAtTime(0.0001, at(u) + dur);
        s.connect(fl);
        fl.connect(g);
        g.connect(ac.destination);
        s.start(at(u));
      };

      noise(0.2, 2.2, 120, 420, 0.05);
      noise(2.45, 0.55, 400, 3500, 0.2);
      DROPS.forEach(([td, k, vol]) => {
        tone(td, 1500 / (0.6 + vol), 0.14, 0.35, 500 / (0.6 + vol));
        tone(td + 0.02, 700 - k * 60, 0.08 * vol, 1.2);
      });
      tone(4.9, 110, 0.3, 1.2, 55);
      [523.3, 659.3, 784].forEach((f) => tone(4.9, f, 0.06, 1.6));
    }

    const handleSoundToggle = () => {
      soundOn = !soundOn;
      if (snd) snd.setAttribute('aria-pressed', String(soundOn));
      if (soundOn) {
        try {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          ac = ac || new AudioContextClass();
          ac.resume();
          if (phase === 'run') schedule(curT);
        } catch {
          soundOn = false;
          if (snd) snd.setAttribute('aria-pressed', 'false');
        }
      }
    };
    snd?.addEventListener('click', handleSoundToggle);

    // ---------- runtime ----------
    function finish() {
      if (phase !== 'run') return;
      phase = 'dissolve';
      render(END);
      intro!.classList.add('off');
      setTimeout(() => {
        if (phase === 'dissolve') {
          phase = 'done';
          intro!.style.display = 'none';
          cv!.style.filter = 'none';
          try {
            sessionStorage.setItem('atrium-intro-seen', '1');
          } catch {}
          setIsVisible(false);
          document.dispatchEvent(new CustomEvent('atrium:introcomplete'));
          onComplete?.();
        }
      }, 720);
    }

    function loop(now: number) {
      if (phase !== 'run') return;
      const t = (now - t0) / 1000;
      render(Math.min(t, END));
      if (t >= END + 0.3) {
        finish();
      } else {
        raf = requestAnimationFrame(loop);
      }
    }

    function play() {
      cancelAnimationFrame(raf);
      layout();
      intro!.style.display = 'block';
      intro!.style.transition = 'none';
      intro!.classList.remove('off');
      void intro!.offsetWidth;
      intro!.style.transition = '';
      phase = 'run';
      setIsVisible(true);

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        render(END);
        setTimeout(finish, 600);
        return;
      }
      render(0);
      t0 = performance.now();
      schedule(0);
      raf = requestAnimationFrame(loop);
    }

    skip?.addEventListener('click', finish);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', handleKeyDown);

    const handleResize = () => {
      cancelAnimationFrame(rz);
      rz = requestAnimationFrame(() => {
        layout();
        render(curT);
      });
    };
    window.addEventListener('resize', handleResize);

    // Expose AtriumIntro globally
    window.AtriumIntro = {
      play,
      skip: finish,
      seek: (t: number) => {
        layout();
        render(t);
      },
    };
    window.ready = true;
    layout();

    // Start playing
    play();

    return () => {
      window.clearTimeout(safetyTimeout);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(rz);
      snd?.removeEventListener('click', handleSoundToggle);
      skip?.removeEventListener('click', finish);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      if (ac && ac.state !== 'closed') {
        try {
          ac.close();
        } catch {}
      }
    };
  }, [forcePlay, onComplete]);

  if (!isVisible) return null;

  return (
    <>
      <style>{`
        :root { --atrium-ink: #0a0a0a; }
        #intro {
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          overflow: hidden;
          background: #fff;
          touch-action: manipulation;
          transition: opacity .7s cubic-bezier(.32,.72,0,1);
        }
        #intro.off {
          opacity: 0;
          pointer-events: none;
        }
        #cv {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }
        #grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: .035;
          mix-blend-mode: multiply;
        }
        .atrium-ctl {
          position: absolute;
          bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          color: var(--atrium-ink);
          background: rgba(255,255,255,.5);
          border: 1px solid rgba(10,10,10,.28);
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          font: inherit;
          min-height: 44px;
          min-width: 44px;
          border-radius: 999px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: background .3s, transform .3s cubic-bezier(.32,.72,0,1);
          z-index: 2147483001;
        }
        .atrium-ctl:hover {
          background: rgba(255,255,255,.78);
        }
        .atrium-ctl:active {
          transform: scale(.96);
        }
        .atrium-ctl svg {
          width: 20px;
          height: 20px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        #skip {
          right: calc(16px + env(safe-area-inset-right, 0px));
        }
        #snd {
          left: calc(16px + env(safe-area-inset-left, 0px));
        }
        #snd .on {
          display: none;
        }
        #snd[aria-pressed=true] .on {
          display: inline;
        }
        #snd[aria-pressed=true] .off {
          display: none;
        }
      `}</style>
      <div id="intro" ref={containerRef} role="img" aria-label="Atrium">
        <canvas id="cv" ref={canvasRef} />
        <div id="grain" ref={grainRef} />
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <filter id="fw" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
            <feGaussianBlur id="fwb" ref={fwbRef as any} stdDeviation="0 0" />
          </filter>
        </svg>
        <button
          id="snd"
          ref={sndRef}
          className="ctl atrium-ctl"
          type="button"
          aria-label="Sound"
          aria-pressed="false"
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 9v6h4l5 4V5L8 9H4z" />
            <path className="on" d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
            <path className="off" d="M17 9l5 6M22 9l-5 6" />
          </svg>
        </button>
        <button
          id="skip"
          ref={skipRef}
          className="ctl atrium-ctl"
          type="button"
          aria-label="Skip intro"
        >
          <svg viewBox="0 0 24 24">
            <path d="M6 6l6 6-6 6M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </>
  );
};
