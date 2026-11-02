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

  const [isVisible, setIsVisible] = useState<boolean>(true);

  useEffect(() => {
    // If not forced and already seen, complete and exit
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
        } catch {}
        onComplete?.();
        return;
      }
    }

    const cv = canvasRef.current;
    const intro = containerRef.current;
    const grain = grainRef.current;
    const fwb = fwbRef.current;
    const snd = sndRef.current;
    const skip = skipRef.current;

    if (!cv || !intro || !grain || !fwb) {
      try {
        sessionStorage.setItem('atrium-intro-seen', '1');
      } catch {}
      document.dispatchEvent(new CustomEvent('atrium:introcomplete'));
      onComplete?.();
      return;
    }

    const ctx = cv.getContext('2d');
    if (!ctx) {
      try {
        sessionStorage.setItem('atrium-intro-seen', '1');
      } catch {}
      document.dispatchEvent(new CustomEvent('atrium:introcomplete'));
      onComplete?.();
      return;
    }

    // ==========================================
    // EXACT ATRIUM CONFLUENCE V2 ANIMATION MODEL
    // ==========================================
    const GL: Record<string, { d: string; x0: number; x1: number }> = {
      A: {
        d: 'M64.0 0.0V-539.0H90.0V0.0H154.0V-770.0C154.0 -812.0 119.0 -847.0 77.0 -847.0C35.0 -847.0 0.0 -812.0 0.0 -770.0V0.0ZM64.0 -757.0C64.0 -764.0 70.0 -770.0 77.0 -770.0C84.0 -770.0 90.0 -764.0 90.0 -757.0V-616.0H64.0Z',
        x0: 0,
        x1: 154,
      },
      I: {
        d: 'M77.0 -847.0H0.0V0.0H77.0Z',
        x0: 0,
        x1: 77,
      },
      M: {
        d: 'M64.0 0.0V-770.0H90.0V0.0H143.0V-770.0H155.0C162.0 -770.0 168.0 -764.0 168.0 -757.0V0.0H232.0V-770.0C232.0 -812.0 198.0 -847.0 155.0 -847.0H0.0V0.0Z',
        x0: 0,
        x1: 232,
      },
      R: {
        d: 'M0.0 0.0H64.0V-539.0H77.0C84.0 -539.0 90.0 -533.0 90.0 -526.0V0.0H154.0V-540.0C154.0 -561.0 137.0 -578.0 116.0 -578.0C137.0 -578.0 154.0 -595.0 154.0 -615.0V-770.0C154.0 -812.0 119.0 -847.0 77.0 -847.0H0.0ZM64.0 -769.0H77.0C84.0 -769.0 90.0 -764.0 90.0 -757.0V-628.0C90.0 -621.0 84.0 -616.0 77.0 -616.0H64.0Z',
        x0: 0,
        x1: 154,
      },
      T: {
        d: 'M0.0 -770.0H45.0V0.0H109.0V-770.0H154.0V-847.0H0.0Z',
        x0: 0,
        x1: 154,
      },
      U: {
        d: 'M0.0 -77.0C0.0 -34.0 34.0 0.0 77.0 0.0C119.0 0.0 154.0 -34.0 154.0 -77.0V-847.0H90.0V-90.0C90.0 -83.0 84.0 -77.0 77.0 -77.0C70.0 -77.0 64.0 -83.0 64.0 -90.0V-847.0H0.0Z',
        x0: 0,
        x1: 154,
      },
    };

    const T = '#D3542E';
    const K = '#F1E8DD';
    const B = '#0A0A0A';
    const G = '#E9A23B';
    const W = '#FFFFFF';

    const PHI = 1.618034;
    const M_VAL = 847;
    const STEM = 77;
    const c3 = M_VAL / PHI ** 3;
    const RC = STEM / PHI ** 2;
    const RO = M_VAL / PHI ** 6;
    const GAP = STEM / PHI;
    const END = 6;
    const cs0 = M_VAL - 2 * c3 - STEM;

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
      const A = hex(a);
      const C = hex(b);
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
    const items: Array<{ ch: string; w: number; g: { d: string; x0: number; x1: number }; p: Path2D }> = [];
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
    const WW = xx;
    const X0 = M_VAL + STEM * PHI;
    const LW = X0 + WW;
    const SUMW = items.reduce((a, b) => a + b.w, 0);
    const ZN = [
      [[0.3, 0.7]],
      [[0, 0.33], [0.67, 1]],
      [[0.3, 0.75]],
      [],
      [[0.3, 0.7]],
      [[0.22, 0.42], [0.58, 0.78]],
    ];

    // ---------- symbols (wordless, built from the logo's own shapes) ----------
    const r_ = (x: number, y: number, w: number, h: number, rd: number, c: string) => ['r', x, y, w, h, rd, c] as const;
    const c_ = (x: number, y: number, r: number, c: string) => ['c', x, y, r, c] as const;
    const l_ = (x1: number, y1: number, x2: number, y2: number, w: number, c: string) => ['l', x1, y1, x2, y2, w, c] as const;
    const s_ = (x: number, y: number, r: number, c: string) => ['s', x, y, r, c] as const;

    type Prim = ReturnType<typeof r_> | ReturnType<typeof c_> | ReturnType<typeof l_> | ReturnType<typeof s_>;

    interface SymbolDef {
      b: string | null;
      g: number;
      d: Prim[];
      sz?: number;
      m?: number;
    }

    const SY: SymbolDef[] = [
      // clients
      { b: T, g: 0, d: [r_(-0.07, -0.28, 0.14, 0.56, 0.04, K), r_(-0.28, -0.07, 0.56, 0.14, 0.04, K)] },
      { b: B, g: 0, d: [r_(-0.32, -0.2, 0.64, 0.4, 0.07, K), c_(-0.17, -0.02, 0.07, B), r_(-0.02, -0.07, 0.22, 0.05, 0.02, B), r_(-0.02, 0.03, 0.16, 0.05, 0.02, B)] },
      { b: K, g: 0, d: [r_(-0.32, -0.32, 0.64, 0.17, 0.04, T), c_(-0.18, -0.36, 0.04, B), c_(0.18, -0.36, 0.04, B), r_(-0.28, -0.06, 0.17, 0.17, 0.03, B), r_(-0.05, -0.06, 0.17, 0.17, 0.03, B), r_(-0.28, 0.17, 0.17, 0.12, 0.03, B)] },
      { b: G, g: 0, d: [r_(-0.3, -0.25, 0.6, 0.38, 0.12, B), r_(-0.2, 0.1, 0.12, 0.15, 0.04, B), c_(-0.14, -0.06, 0.04, G), c_(0, -0.06, 0.04, G), c_(0.14, -0.06, 0.04, G)] },
      { b: K, g: 0, d: [r_(-0.32, -0.2, 0.64, 0.4, 0.05, B), l_(-0.28, -0.16, 0, 0.05, 0.05, K), l_(0, 0.05, 0.28, -0.16, 0.05, K)] },
      { b: T, g: 0, d: [r_(-0.34, -0.12, 0.4, 0.24, 0.1, K), r_(-0.06, -0.12, 0.4, 0.24, 0.1, B), c_(0, 0, 0.05, T)] },
      { b: B, g: 0, d: [r_(-0.16, -0.32, 0.32, 0.64, 0.08, K), r_(-0.1, -0.24, 0.2, 0.4, 0.02, B), c_(0, 0.24, 0.035, B)] },
      { b: G, g: 0, d: [c_(0, -0.1, 0.2, B), c_(0, -0.1, 0.08, G), r_(-0.03, 0.06, 0.06, 0.24, 0.03, B)] },
      // work
      { b: G, g: 1, d: [r_(-0.03, -0.05, 0.06, 0.36, 0.02, B), c_(-0.13, -0.14, 0.11, B), c_(0.14, -0.22, 0.11, B)] },
      { b: B, g: 1, d: [r_(-0.3, -0.3, 0.6, 0.05, 0.02, K), r_(-0.3, -0.3, 0.05, 0.6, 0.02, K), r_(-0.3, 0.25, 0.6, 0.05, 0.02, K), r_(0.25, -0.3, 0.05, 0.3, 0.02, K)] },
      { b: K, g: 1, d: [r_(-0.28, 0.02, 0.24, 0.24, 0.04, B), r_(0.04, 0.02, 0.24, 0.24, 0.04, B), r_(-0.12, -0.28, 0.24, 0.24, 0.04, B)] },
      { b: T, g: 1, d: [r_(-0.34, -0.12, 0.4, 0.3, 0.04, K), r_(0.08, -0.04, 0.26, 0.22, 0.04, K), c_(-0.2, 0.2, 0.07, B), c_(0.2, 0.2, 0.07, B)] },
      { b: B, g: 1, d: [c_(0, 0, 0.22, K), c_(0, 0, 0.09, B), r_(-0.04, -0.34, 0.08, 0.12, 0.02, K), r_(-0.04, 0.22, 0.08, 0.12, 0.02, K), r_(-0.34, -0.04, 0.12, 0.08, 0.02, K), r_(0.22, -0.04, 0.12, 0.08, 0.02, K)] },
      { b: K, g: 1, d: [r_(-0.22, -0.32, 0.44, 0.64, 0.05, B), r_(-0.14, -0.2, 0.28, 0.04, 0.02, K), r_(-0.14, -0.08, 0.28, 0.04, 0.02, K), r_(-0.14, 0.04, 0.18, 0.04, 0.02, K)] },
      { b: G, g: 1, d: [r_(-0.3, -0.24, 0.1, 0.1, 0.03, B), r_(-0.12, -0.22, 0.4, 0.06, 0.03, B), r_(-0.3, -0.05, 0.1, 0.1, 0.03, B), r_(-0.12, -0.03, 0.4, 0.06, 0.03, B), r_(-0.3, 0.14, 0.1, 0.1, 0.03, B), r_(-0.12, 0.16, 0.3, 0.06, 0.03, B)] },
      { b: T, g: 1, d: [c_(-0.16, 0, 0.14, K), c_(-0.16, 0, 0.06, T), r_(-0.04, -0.04, 0.4, 0.08, 0.03, K), r_(0.2, 0, 0.06, 0.14, 0.02, K)] },
      { b: K, g: 1, d: [r_(-0.26, -0.2, 0.5, 0.46, 0.05, B), c_(0, -0.26, 0.09, B), c_(0.26, 0.04, 0.09, B)] },
      // money
      { b: B, g: 2, d: [r_(-0.3, -0.25, 0.05, 0.5, 0, K), r_(-0.2, -0.25, 0.1, 0.5, 0, K), r_(-0.05, -0.25, 0.04, 0.5, 0, K), r_(0.04, -0.25, 0.09, 0.5, 0, K), r_(0.2, -0.25, 0.05, 0.5, 0, K)] },
      { b: K, g: 2, d: [c_(0, 0, 0.3, T), c_(0, 0, 0.19, K), c_(0, 0, 0.08, T)] },
      { b: G, g: 2, d: [r_(-0.3, -0.15, 0.36, 0.36, 0.05, B), r_(-0.06, -0.22, 0.36, 0.36, 0.05, K)] },
      { b: G, g: 2, d: [c_(0, 0, 0.3, B), c_(0, 0, 0.22, G), r_(-0.04, -0.14, 0.08, 0.28, 0.03, B)] },
      { b: K, g: 2, d: [r_(-0.34, -0.18, 0.68, 0.36, 0.05, B), c_(0, 0, 0.1, K), c_(-0.24, -0.04, 0.03, K), c_(0.24, 0.04, 0.03, K)] },
      { b: B, g: 2, d: [r_(-0.22, -0.32, 0.44, 0.64, 0.04, K), r_(-0.14, -0.22, 0.28, 0.05, 0.02, B), r_(-0.14, -0.1, 0.28, 0.04, 0.02, B), r_(-0.14, 0, 0.28, 0.04, 0.02, B), r_(-0.14, 0.16, 0.14, 0.08, 0.02, T)] },
      { b: T, g: 2, d: [r_(-0.32, -0.16, 0.64, 0.38, 0.07, K), r_(0.08, -0.04, 0.24, 0.14, 0.05, T), c_(0.2, 0.03, 0.03, K)] },
      { b: K, g: 2, d: [c_(-0.15, -0.15, 0.1, T), c_(0.15, 0.15, 0.1, T), l_(0.2, -0.2, -0.2, 0.2, 0.07, B)] },
      { b: B, g: 2, d: [r_(-0.28, 0.02, 0.14, 0.26, 0.03, K), r_(-0.07, -0.12, 0.14, 0.4, 0.03, G), r_(0.14, -0.26, 0.14, 0.54, 0.03, K)] },
      { b: G, g: 2, d: [r_(-0.28, -0.12, 0.56, 0.28, 0.05, B), l_(-0.34, -0.26, -0.2, -0.12, 0.06, B), c_(-0.14, 0.26, 0.06, B), c_(0.14, 0.26, 0.06, B)] },
      // people and success
      { b: T, g: 3, d: [c_(0, -0.14, 0.12, K), c_(-0.2, 0.1, 0.12, K), c_(0.2, 0.1, 0.12, K)] },
      { b: G, g: 3, d: [r_(-0.18, -0.28, 0.36, 0.3, 0.1, B), r_(-0.04, 0, 0.08, 0.2, 0.02, B), r_(-0.16, 0.2, 0.32, 0.07, 0.02, B), c_(-0.24, -0.15, 0.07, B), c_(0.24, -0.15, 0.07, B)] },
      { b: B, g: 3, d: [s_(0, 0, 0.3, G)] },
      { b: K, g: 3, d: [r_(-0.1, -0.3, 0.2, 0.5, 0.1, B), r_(-0.22, 0.08, 0.12, 0.16, 0.03, T), r_(0.1, 0.08, 0.12, 0.16, 0.03, T), c_(0, -0.12, 0.05, K), c_(0, 0.3, 0.05, T)] },
      { b: T, g: 3, d: [c_(0, -0.08, 0.2, K), r_(-0.09, 0.1, 0.18, 0.12, 0.03, K), r_(-0.07, 0.24, 0.14, 0.04, 0.02, B)] },
      { b: B, g: 3, d: [r_(-0.2, -0.3, 0.05, 0.6, 0.02, K), r_(-0.15, -0.28, 0.42, 0.26, 0.03, T)] },
      { b: G, g: 3, d: [r_(-0.24, -0.28, 0.48, 0.4, 0.08, B), c_(0, 0.04, 0.24, B), l_(-0.1, 0, -0.02, 0.1, 0.06, G), l_(-0.02, 0.1, 0.14, -0.08, 0.06, G)] },
      { b: K, g: 3, d: [l_(-0.34, -0.06, 0, -0.22, 0.07, B), l_(0, -0.22, 0.34, -0.06, 0.07, B), l_(0.34, -0.06, 0, 0.1, 0.07, B), l_(0, 0.1, -0.34, -0.06, 0.07, B), r_(0.26, -0.02, 0.04, 0.26, 0.02, T)] },
      { b: T, g: 3, d: [r_(-0.3, -0.22, 0.6, 0.05, 0.02, K), r_(-0.025, -0.22, 0.05, 0.5, 0.02, K), c_(-0.22, 0.04, 0.1, K), c_(0.22, 0.04, 0.1, K)] },
      { b: K, g: 3, d: [c_(-0.06, -0.1, 0.17, T), r_(0.04, 0.12, 0.28, 0.06, 0.03, B)] },
      { b: null, g: 3, d: [] },
    ];

    const NSY = SY.length;
    const SZV = [0.062, 0.074, 0.088];
    const GCNT = [0, 0, 0, 0];
    SY.forEach((q, i) => {
      q.sz = SZV[(i * 7) % 3];
      q.m = GCNT[q.g]++;
    });

    const pc = (p: Prim): [number, number] =>
      p[0] === 'c' || p[0] === 's'
        ? [p[1], p[2]]
        : p[0] === 'l'
        ? [(p[1] + p[3]) / 2, (p[2] + p[4]) / 2]
        : [p[1] + p[3] / 2, p[2] + p[4] / 2];

    const pq = (p: Prim): number =>
      p[0] === 'c' || p[0] === 's'
        ? (p[3] as number) * 2
        : p[0] === 'l'
        ? (p[5] as number) * 1.6
        : Math.min(p[3] as number, p[4] as number);

    // ---------- world simulation (fixed step, seeded, resolution independent) ----------
    const DT = 1 / 120;
    const TS = 3.0;
    const NS = Math.ceil(TS / DT) + 2;
    const MS = 0.34;
    const CCOFF = ((M_VAL / 2 - c3 / 2) / M_VAL) * MS;
    const CCSZ = (c3 / M_VAL) * MS;
    const RR = (((cs0 + STEM) / M_VAL) * MS) / 2;
    const DIR = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];

    const SYP = new Float32Array(NS * NSY * 2);
    const DET: Array<{ s: number; p: Prim; k: number }> = [];
    const TSH: number[] = [];

    SY.forEach((q, i) => q.d.forEach((p, k) => DET.push({ s: i, p, k })));
    const ND = DET.length;
    const DP = new Float32Array(NS * ND * 2);

    {
      const rnd = RNG(5);
      const P: Array<[number, number]> = [];
      const V: Array<[number, number]> = [];
      SY.forEach((_q, i) => {
        const col = i % 8;
        const row = (i / 8) | 0;
        P.push([-0.42 + col * 0.12 + (rnd() - 0.5) * 0.05, -0.2 + row * 0.1 + (rnd() - 0.5) * 0.04]);
        V.push([(rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.1]);
      });
      const dp = DET.map(() => [0, 0] as [number, number]);
      const dv = DET.map(() => [0, 0] as [number, number]);
      DET.forEach(() => TSH.push(2.2 + rnd() * 0.35));
      const kick = DET.map(() => {
        const a = rnd() * 6.283;
        return [Math.cos(a) * 0.12, Math.sin(a) * 0.12];
      });
      const offs = (g: number, m: number) => {
        if (m === 0) return [0, 0];
        const n = GCNT[g] - 1;
        const a = ((m - 1) / n) * 6.2832;
        return [Math.cos(a) * 0.03, Math.sin(a) * 0.03];
      };

      for (let n = 0; n < NS; n++) {
        const t = n * DT;
        for (let i = 0; i < NSY; i++) {
          SYP[n * NSY * 2 + i * 2] = P[i][0];
          SYP[n * NSY * 2 + i * 2 + 1] = P[i][1];
        }
        DET.forEach((d, k) => {
          let x: number;
          let y: number;
          if (t < TSH[k]) {
            const o = pc(d.p);
            const q = SY[d.s];
            x = P[d.s][0] + o[0] * (q.sz || 0.07);
            y = P[d.s][1] + o[1] * (q.sz || 0.07);
            dp[k] = [x, y];
            dv[k] = [V[d.s][0] + kick[k][0], V[d.s][1] + kick[k][1]];
          } else {
            x = dp[k][0];
            y = dp[k][1];
          }
          DP[n * ND * 2 + k * 2] = x;
          DP[n * ND * 2 + k * 2 + 1] = y;
        });
        const rs = sm((t - 1.8) / 0.5);
        const kS = 0.8 * rs;
        const kT = 0.18 * rs;
        for (let i = 0; i < NSY; i++) {
          let ax = 0;
          let ay = 0;
          const p = P[i];
          const v = V[i];
          if (rs < 1) {
            let cxn = 0;
            let cyn = 0;
            let vxn = 0;
            let vyn = 0;
            let nn = 0;
            for (let j = 0; j < NSY; j++) {
              if (j === i) continue;
              const dx = p[0] - P[j][0];
              const dy = p[1] - P[j][1];
              const r = Math.hypot(dx, dy) + 1e-6;
              if (r < 0.1) {
                const f = (0.1 - r) * 7;
                ax += (dx / r) * f;
                ay += (dy / r) * f;
              }
              if (r < 0.26) {
                cxn += P[j][0];
                cyn += P[j][1];
                vxn += V[j][0];
                vyn += V[j][1];
                nn++;
              }
            }
            if (nn) {
              ax += (cxn / nn - p[0]) * 0.5 + (vxn / nn - v[0]) * 0.8;
              ay += (cyn / nn - p[1]) * 0.5 + (vyn / nn - v[1]) * 0.8;
            }
            ax += -p[0] * 0.45 + 0.07 * Math.sin(5.1 * p[1] + 0.9 * t + i);
            ay += -p[1] * 0.9 + 0.07 * Math.cos(4.3 * p[0] + 0.7 * t + i * 1.3);
            const sp = Math.hypot(v[0], v[1]);
            if (sp > 0.15) {
              ax -= v[0] * (sp - 0.15) * 8;
              ay -= v[1] * (sp - 0.15) * 8;
            }
          }
          if (rs > 0) {
            const rl = Math.hypot(p[0], p[1]) + 1e-6;
            const rx = p[0] / rl;
            const ry = p[1] / rl;
            ax += -rx * kS * 0.9 + -ry * kT * (0.4 / (rl + 0.1));
            ay += -ry * kS * 0.9 + rx * kT * (0.4 / (rl + 0.1));
          }
          ax -= v[0] * (0.5 + 2.5 * rs);
          ay -= v[1] * (0.5 + 2.5 * rs);
          const tg = clamp((t - 2.3) / 0.25);
          if (tg > 0) {
            const q = SY[i];
            const fu = ease((t - 2.6) / 0.2, 4);
            const o = offs(q.g, q.m || 0);
            const tx = DIR[q.g][0] * CCOFF + o[0] * (1 - fu);
            const ty = DIR[q.g][1] * CCOFF + o[1] * (1 - fu);
            ax += (tx - p[0]) * 70 * tg - v[0] * 13 * tg;
            ay += (ty - p[1]) * 70 * tg - v[1] * 13 * tg;
          }
          V[i][0] += ax * DT;
          V[i][1] += ay * DT;
        }
        for (let i = 0; i < NSY; i++) {
          P[i][0] += V[i][0] * DT;
          P[i][1] += V[i][1] * DT;
        }
        DET.forEach((d, k) => {
          if (t < TSH[k]) return;
          const p = dp[k];
          const v = dv[k];
          const rl = Math.hypot(p[0], p[1]) + 1e-6;
          const rx = p[0] / rl;
          const ry = p[1] / rl;
          const rg = clamp((t - 2.5) / 0.2);
          let ax = -rx * kS * 1.3 - ry * kT * (0.4 / (rl + 0.1));
          let ay = -ry * kS * 1.3 + rx * kT * (0.4 / (rl + 0.1));
          const rad = -(rl - RR) * 55 * rg;
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

    const samp = (arr: Float32Array, stride: number, n: number, idx: number, fr: number) =>
      arr[n * stride + idx] * (1 - fr) + arr[(n + 1) * stride + idx] * fr;

    // ---------- letter vessels (connected tanks with inertia, a continuous breath and three drops) ----------
    const VT0 = 3.4;
    const VN = Math.ceil((END - VT0) * 240) + 2;
    const DROPS = [
      [3.95, 4, 1.24],
      [4.3, 2, 0.88],
      [4.6, 0, 0.59],
    ] as const;
    const VS: number[][] = [];

    {
      const g = 40;
      const c = 4;
      const h = 1 / 240;
      const L = new Array(6).fill(0);
      const F = new Array(5).fill(0);
      for (let n = 0; n < VN; n++) {
        VS.push(L.slice());
        const t = VT0 + n * h;
        const be = sm((t - 3.5) / 0.4) * (1 - sm((t - 4.85) / 0.45));
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
              if (j !== k) L[j] -= (amt * (1 / ((j - k) * (j - k)))) / ws;
            }
          }
        }
        for (let i = 0; i < 5; i++) {
          F[i] += (g * (L[i] - L[i + 1]) - c * F[i] + 22 * Math.sin((2 * Math.PI * t) / 1.6 - 0.9 * i) * be) * h;
        }
        for (let i = 0; i < 5; i++) {
          L[i] -= F[i] * h;
          L[i + 1] += F[i] * h;
        }
      }
    }

    function tanks(t: number) {
      const o = new Array(6).fill(0);
      if (t < VT0) return o;
      const f = (t - VT0) * 240;
      const i0 = Math.min(VN - 1, Math.floor(f));
      const i1 = Math.min(VN - 1, i0 + 1);
      const fr = f - i0;
      const env = 1 - sm((t - 5.05) / 0.3);
      for (let i = 0; i < 6; i++) {
        o[i] = lerp(VS[i0][i], VS[i1][i], fr) * env;
      }
      return o;
    }

    function widths(t: number) {
      const L = tanks(t);
      const w = items.map((it, i) => Math.max(0.42 * it.w, it.w + 154 * L[i]));
      const s = SUMW / w.reduce((a, b) => a + b, 0);
      return w.map((v) => v * s);
    }

    // ---------- layout ----------
    let vw = 0;
    let vh = 0;
    let dpr = 1;
    let cx = 0;
    let cy = 0;
    let sc = 1;
    let Lw = 0;
    let k0 = 1;
    let Hh = 0;
    let ox = 0;
    let oy = 0;
    let by = 0;
    let cx0 = 0;
    let WU = 0;
    let wl0 = 0;
    let wl1 = 0;
    let curT = 0;

    function layout() {
      if (!cv) return;
      vw = window.innerWidth;
      vh = window.innerHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(vw * dpr);
      cv.height = Math.round(vh * dpr);
      cx = vw / 2;
      cy = vh / 2;
      sc = Math.min(vw, vh) / 1080;
      const asp = vw / vh;
      Lw = Math.min(vw * (asp > 1.25 ? 0.46 : 0.8), 1100);
      k0 = Lw / LW;
      Hh = M_VAL * k0;
      ox = cx - Lw / 2;
      oy = cy - Hh / 2;
      by = oy + Hh;
      cx0 = ox + (M_VAL / 2) * k0;
      const mk1 = Math.min(Lw * 0.62, Math.min(vw, vh) * 0.6);
      WU = Math.min(mk1 / MS, vw * 0.92, (vh * 0.92) / 0.56);
      wl0 = cx - (WW * k0) / 2;
      wl1 = ox + X0 * k0;
    }

    // ---------- drawing helpers ----------
    function rr(x: number, y: number, w: number, h: number, r: number) {
      ctx!.beginPath();
      ctx!.roundRect(x, y, Math.max(0, w), Math.max(0, h), Math.max(0, Math.min(r, Math.min(w, h) / 2)));
    }

    function noisePoly(x0: number, y0: number, R: number, n: number, ph: number, a1: number, a2: number) {
      ctx!.beginPath();
      for (let j = 0; j < n; j++) {
        const th = (j / n) * 6.2832;
        const r =
          R *
          (1 +
            a1 * Math.sin(5 * th + ph * 4) +
            a2 * Math.sin(9 * th - ph * 6 + 1) +
            0.03 * Math.sin(14 * th + ph * 8));
        const x = x0 + Math.cos(th) * r;
        const y = y0 + Math.sin(th) * r;
        j ? ctx!.lineTo(x, y) : ctx!.moveTo(x, y);
      }
      ctx!.closePath();
    }

    function drawPrim(p: Prim, X: number, Y: number, S: number) {
      const col = p[p.length - 1] as string;
      ctx!.fillStyle = col;
      ctx!.strokeStyle = col;
      if (p[0] === 'c') {
        ctx!.beginPath();
        ctx!.arc(X + p[1] * S, Y + p[2] * S, Math.max(0, p[3] * S), 0, 6.2832);
        ctx!.fill();
      } else if (p[0] === 's') {
        const R_ = p[3] * S;
        ctx!.beginPath();
        for (let k = 0; k < 10; k++) {
          const r = k % 2 ? R_ * 0.45 : R_;
          const an = -1.5708 + k * 0.62832;
          const x = X + p[1] * S + Math.cos(an) * r;
          const y = Y + p[2] * S + Math.sin(an) * r;
          k ? ctx!.lineTo(x, y) : ctx!.moveTo(x, y);
        }
        ctx!.closePath();
        ctx!.fill();
      } else if (p[0] === 'l') {
        ctx!.lineWidth = p[5] * S;
        ctx!.lineCap = 'round';
        ctx!.beginPath();
        ctx!.moveTo(X + p[1] * S, Y + p[2] * S);
        ctx!.lineTo(X + p[3] * S, Y + p[4] * S);
        ctx!.stroke();
      } else {
        rr(X + p[1] * S, Y + p[2] * S, p[3] * S, p[4] * S, p[5] * S);
        ctx!.fill();
      }
    }

    function drawMark(X: number, Y: number, s: number, P: { dist: number[]; arc: number[]; dip: number[]; col: string; rot: number; rs: number }) {
      ctx!.save();
      ctx!.translate(X, Y);
      ctx!.scale(s, s);
      ctx!.translate(-M_VAL / 2, -M_VAL / 2);
      for (let i = 0; i < 4; i++) {
        const cx_ = (i & 1) * (M_VAL - c3) + c3 / 2;
        const cy_ = (i >> 1) * (M_VAL - c3) + c3 / 2;
        const d = P.dist[i];
        const ar = P.arc[i];
        ctx!.save();
        ctx!.translate(DIR[i][0] * d - DIR[i][1] * ar, DIR[i][1] * d + DIR[i][0] * ar);
        ctx!.translate(cx_, cy_);
        ctx!.scale(P.dip[i], P.dip[i]);
        ctx!.translate(-cx_, -cy_);
        ctx!.fillStyle = P.col;
        rr((i & 1) * (M_VAL - c3), (i >> 1) * (M_VAL - c3), c3, c3, RC);
        ctx!.fill();
        ctx!.restore();
      }
      ctx!.translate(M_VAL / 2, M_VAL / 2);
      ctx!.rotate((P.rot * Math.PI) / 180);
      ctx!.scale(Math.max(P.rs, 1e-4), Math.max(P.rs, 1e-4));
      ctx!.strokeStyle = P.col;
      ctx!.lineWidth = STEM;
      rr(-cs0 / 2, -cs0 / 2, cs0, cs0, RO - STEM / 2);
      ctx!.stroke();
      ctx!.restore();
    }

    const dipF = (tau: number) => (tau <= 0 ? 1 : 1 - 0.2 * Math.exp(-10 * tau) * (1 - Math.exp(-60 * tau)));

    function drawLetter(i: number, x: number, wU: number, hs: number, col: string, ox_: number, oy_: number) {
      const it = items[i];
      const w = it.w;
      const Sx = wU / w;
      const Z = ZN[i];
      const Zf = Z.reduce((a, z) => a + z[1] - z[0], 0);
      const g = it.g;
      ctx!.fillStyle = col;
      if (Sx < 1 || !Z.length) {
        const f = Z.length ? Sx : Math.min(Sx, 1);
        const sx = x + (Z.length ? 0 : ((wU - w * f) * k0) / 2);
        ctx!.save();
        ctx!.translate(sx + ox_, by + oy_);
        ctx!.scale(k0 * f, k0 * hs);
        ctx!.translate(-g.x0, 0);
        ctx!.fill(it.p);
        ctx!.restore();
        return;
      }
      const Sz = (Sx - (1 - Zf)) / Zf;
      const segs: Array<[number, number, boolean]> = [];
      let cur = 0;
      for (const z of Z) {
        if (z[0] > cur) segs.push([cur, z[0], false]);
        segs.push([z[0], z[1], true]);
        cur = z[1];
      }
      if (cur < 1) segs.push([cur, 1, false]);
      let D = x;
      segs.forEach((s, n) => {
        const a = s[0] * w;
        const b = s[1] * w;
        const f = s[2] ? Sz : 1;
        const wd = (b - a) * k0 * f;
        ctx!.save();
        ctx!.beginPath();
        ctx!.rect(D - (n ? 0.6 : 3) + ox_, by - Hh * 1.5 + oy_, wd + (n < segs.length - 1 ? 1.2 : 3) + (n ? 0 : 0.6), Hh * 2);
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
    const BLOB_W = ['#FCF3EA', '#FDF1DF', '#FAEBE3'];
    const BLOB_O = ['#C94B27', '#B8441F', '#D95F3A'];
    const SPK = (() => {
      const r = RNG(21);
      const a: Array<{ x: number; y: number; vx: number; vy: number; s: number }> = [];
      for (let i = 0; i < 46; i++) {
        a.push({ x: r(), y: r(), vx: (r() - 0.5) * 0.012, vy: -0.004 - r() * 0.01, s: 1 + r() * 2.2 });
      }
      return a;
    })();

    const POPS: ReadonlyArray<readonly [number, number]> = [
      [3, 0.5],
      [17, 0.9],
      [29, 1.3],
    ];
    const TF0 = 2.9;
    const TF1 = 3.45;
    const TW0 = 3.45;
    const REV = 4.95;
    const WCOL = ['rgba(211,84,46,0.18)', 'rgba(233,162,59,0.24)', 'rgba(10,10,10,0.08)'];

    function render(t: number) {
      if (!ctx || !cv) return;
      t = clamp(t, 0, END);
      curT = t;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const flood = t >= TF0 && t < TF1;
      const orange = t >= TF1;
      const dgn = Math.hypot(vw, vh);
      ctx.fillStyle = orange ? T : W;
      ctx.fillRect(0, 0, vw, vh);
      const wU = widths(t);
      const hs = wU.map((v, i) => clamp(1 - 0.12 * (v / items[i].w - 1), 0.9, 1.08));
      const N = vh < 520 ? 20 : 36;
      const rs = sm((t - 1.8) / 0.5);
      const swirl = 2.6 * rs * (1 - sm((t - TF0) / 0.5));
      const calm = 1 - sm((t - 5.0) / 0.5);
      const camS = t < TF0 ? 1 + (0.04 * t) / TF0 : 1.04 * Math.exp(Math.log(14) * eIn((t - TF0) / 0.55, 4));
      const esl = spr((t - REV) / 0.55, 7);

      function far(cols: string[], al: number, k?: number) {
        k = k || 1;
        cols.forEach((c_, j) => {
          const ph = j * 2.1;
          const R_ = WU * (0.35 + 0.12 * j) * k;
          const x = cx + Math.cos(0.12 * t + ph) * vw * 0.3;
          const y = cy + Math.sin(0.1 * t + ph * 1.4) * vh * 0.25;
          ctx!.globalAlpha = al;
          ctx!.fillStyle = c_;
          noisePoly(x, y, R_, 56, t * 0.15 + ph, 0.1, 0.06);
          ctx!.fill();
        });
        ctx!.globalAlpha = 1;
      }

      function lines(white: boolean, react: boolean) {
        ctx!.lineWidth = Math.max(1, 1.3 * sc);
        for (let j = 0; j < N; j++) {
          ctx!.strokeStyle = white ? WCOL[j % 3] : j % 5 === 0 ? 'rgba(233,162,59,0.26)' : 'rgba(241,232,221,0.22)';
          const y0 = ((j + 0.5) / N) * vh;
          ctx!.beginPath();
          for (let s = 0; s <= 56; s++) {
            const x0 = -0.05 * vw + (s / 56) * 1.1 * vw;
            let x = x0;
            let y = y0 + 10 * sc * calm * Math.sin(x0 / (110 * sc) - 0.9 * t + j * 0.5);
            if (swirl > 0) {
              const dx = x - cx;
              const dy = y - cy;
              const r = Math.hypot(dx, dy);
              const a = swirl * Math.exp(-Math.pow(r / (0.4 * WU), 2));
              const ca = Math.cos(a);
              const sa = Math.sin(a);
              x = cx + dx * ca - dy * sa;
              y = cy + dx * sa + dy * ca;
            }
            if (react) {
              const sg = y0 < cy ? -1 : 1;
              let X = lerp(wl0, wl1, esl);
              for (let i = 0; i < 6; i++) {
                const wp = wU[i] * k0;
                const mid = X + wp / 2;
                const S_ = wU[i] / items[i].w - 1;
                y += sg * 0.3 * Hh * clamp(S_, -0.6, 1) * Math.exp(-Math.pow((x - mid) / (0.8 * wp + 20 * sc), 2)) * calm;
                X += wp + (i < 5 ? gapU[i] * k0 : 0);
              }
            }
            s ? ctx!.lineTo(x, y) : ctx!.moveTo(x, y);
          }
          ctx!.stroke();
        }
      }

      if (!orange) {
        far(BLOB_W, 1, 0.5);
        lines(true, false);
      }
      if (flood) {
        const R = lerp(0, 1.35 * dgn, eio3((t - TF0) / 0.55));
        ctx.fillStyle = G;
        noisePoly(cx, cy, R * 1.07, 96, t, 0.07, 0.05);
        ctx.fill();
        ctx.fillStyle = K;
        noisePoly(cx, cy, R * 1.035, 96, t, 0.07, 0.05);
        ctx.fill();
        ctx.fillStyle = T;
        noisePoly(cx, cy, R, 96, t, 0.07, 0.05);
        ctx.fill();

        ctx.save();
        noisePoly(cx, cy, R, 96, t, 0.07, 0.05);
        ctx.clip();
        far(BLOB_O, 0.5);
        lines(false, true);
        ctx.restore();
      }
      if (orange) {
        far(BLOB_O, 0.5);
        lines(false, true);
      }
      const wsd = Math.max(1, sc * 30) * Math.pow(Math.sin(Math.PI * clamp((t - 3.0) / 0.45)), 2);
      if (wsd > 0.6) {
        fwb!.setAttribute('stdDeviation', wsd.toFixed(2) + ' 0');
        cv.style.filter = 'url(#fw)';
      } else {
        cv.style.filter = 'none';
      }

      // ---- scene 1 world ----
      if (t < 3.5) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(camS, camS);
        ctx.translate(-cx, -cy);
        const n = Math.min(NS - 2, Math.floor(t / DT));
        const fr = t / DT - n;
        const ts = Math.min(t, TS - 0.05);
        const fu = ease((t - 2.6) / 0.2, 4);
        const absorb = ease((t - 2.75) / 0.14, 3);
        const sp = (i: number, _c?: number) => cx + samp(SYP, NSY * 2, n, i * 2, fr) * WU;
        const spy = (i: number) => cy + samp(SYP, NSY * 2, n, i * 2 + 1, fr) * WU;
        const pop = (i: number) => {
          for (const [pi, tp] of POPS) {
            if (pi === i) return 1 + 0.18 * Math.sin(Math.PI * clamp((t - tp) / 0.4));
          }
          return 1;
        };

        SY.forEach((q, i) => {
          const x = sp(i);
          const y = spy(i);
          const sz = lerp((q.sz || 0.07) * pop(i), CCSZ, fu) * WU;
          if (q.b === null) {
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
            ctx!.fillStyle = mixc(q.b, T, fu);
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
          const q = SY[d.s];
          if (ts < TSH[k]) {
            if (q.b !== null) drawPrim(d.p, sp(d.s), spy(d.s), (q.sz || 0.07) * pop(d.s) * WU);
            return;
          }
          const a = 1 - absorb;
          if (a <= 0.01) return;
          const X = cx + samp(DP, ND * 2, n, k * 2, fr) * WU;
          const Y = cy + samp(DP, ND * 2, n, k * 2 + 1, fr) * WU;
          const col = d.p[d.p.length - 1] as string;
          const sq = Math.max(2, pq(d.p) * (q.sz || 0.07) * WU * 0.9) * a;
          ctx!.fillStyle = col === K ? T : col;
          rr(X - sq / 2, Y - sq / 2, sq, sq, sq * 0.3);
          ctx!.fill();
        });

        const ringW = ((absorb * STEM) / M_VAL) * MS * WU;
        if (ringW > 0.3) {
          const sz = (cs0 / M_VAL) * MS * WU;
          const rot = 200 * ease((t - 2.75) / 0.6, 4);
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate((rot * Math.PI) / 180);
          ctx.strokeStyle = B;
          ctx.lineWidth = ringW;
          rr(-sz / 2, -sz / 2, sz, sz, (((RO - STEM / 2) / M_VAL) * MS * WU));
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }

      // ---- word, pool, dust, drops ----
      if (t >= TW0) {
        const rip = DROPS.reduce((a, d) => (t > d[0] ? a + Math.exp(-3 * (t - d[0])) * Math.sin(38 * (t - d[0])) : a), 0);
        // dust (near layer): pushed away by each drop
        const dE = 1 - sm((t - 5.3) / 0.5);
        const de = sm((t - TW0) / 0.4);
        ctx.fillStyle = 'rgba(241,232,221,0.4)';
        SPK.forEach((p) => {
          let X = ((((p.x + p.vx * t) % 1) + 1) % 1) * vw;
          let Y = ((((p.y + p.vy * t) % 1) + 1) % 1) * vh;
          DROPS.forEach(([td, k]) => {
            if (t < td) return;
            let xs = lerp(wl0, wl1, esl);
            for (let i = 0; i < k; i++) xs += wU[i] * k0 + gapU[i] * k0;
            const mx = xs + (wU[k] * k0) / 2;
            const dx = X - mx;
            const dy = Y - by;
            const dd = Math.hypot(dx, dy) + 1;
            const a = t - td;
            const pu = 80 * sc * Math.exp(-dd / (320 * sc)) * (1 - Math.exp(-12 * a)) * Math.exp(-2.5 * a);
            X += (dx / dd) * pu;
            Y += (dy / dd) * pu;
          });
          const r = p.s * Math.max(1, sc * 1.4) * dE * de;
          if (r > 0.2) {
            ctx!.beginPath();
            ctx!.arc(X, Y, r, 0, 6.2832);
            ctx!.fill();
          }
        });

        const cam2 = t < REV ? lerp(1, 1.06, eio3((t - TW0) / 1.5)) : lerp(1.06, 1, ease((t - REV) / 0.95, 4));
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(cam2, cam2);
        ctx.translate(-cx, -cy);
        let x = lerp(wl0, wl1, esl);
        const xs: number[] = [];
        const hh: number[] = [];
        items.forEach((it, i) => {
          if (i) x += gapU[i - 1] * k0;
          xs.push(x);
          let h = hs[i];
          for (const [td, k] of DROPS) {
            if (k === i && t >= td) h *= 1 - 0.06 * Math.exp(-9 * (t - td));
          }
          hh.push(h);
          x += wU[i] * k0;
        });

        const poolE = sm((t - TW0) / 0.4) * (1 - sm((t - 5.2) / 0.6));
        const poolH = 0.5 * Hh * poolE;
        if (poolH > 1) {
          ctx.fillStyle = 'rgba(122,38,16,0.24)';
          ctx.fillRect(cx - vw, by, vw * 2, poolH);
          ctx.save();
          ctx.beginPath();
          ctx.rect(cx - vw, by, vw * 2, poolH);
          ctx.clip();
          ctx.translate(0, 2 * by);
          ctx.scale(1, -1);
          ctx.globalAlpha = 0.13 * poolE;
          for (const jx of [-1, 1]) {
            items.forEach((it, i) => {
              if (t >= TW0 + 0.06 * i) drawLetter(i, xs[i], wU[i], hh[i], B, jx * sc * 5 * rip, 0);
            });
          }
          ctx.restore();
          ctx.globalAlpha = 1;
        }

        items.forEach((it, i) => {
          const e = ease((t - (TW0 + 0.06 * i)) / 0.3, 5);
          if (t < TW0 + 0.06 * i) return;
          const dx = (cx - (xs[i] + (wU[i] * k0) / 2)) * 0.5 * (1 - e) * (1 - esl);
          const zf = 1 + 0.1 * (1 - e);
          const br = Math.max(1, sc * 14) * (1 - e);
          if (br > 0.8) {
            for (let q = 0; q < 8; q++) {
              const a = (q / 8) * 6.2832;
              ctx!.globalAlpha = 0.16;
              drawLetter(i, xs[i] + dx, wU[i], hh[i] * zf, B, Math.cos(a) * br, Math.sin(a) * br);
            }
            ctx!.globalAlpha = 1;
          } else {
            drawLetter(i, xs[i] + dx, wU[i], hh[i], B, 0, 0);
          }
        });

        DROPS.forEach(([td, k, vol]) => {
          const mx = xs[k] + (wU[k] * k0) / 2;
          const top = by - Hh * hs[k];
          const t0 = td - 0.4;
          if (t > t0 && t < td) {
            const u = (t - t0) / 0.4;
            const y = lerp(-0.1 * vh, top, u * u);
            const r = Math.max(3, sc * (9 + vol * 8));
            ctx!.fillStyle = G;
            ctx!.beginPath();
            ctx!.ellipse(mx, y, r, r * (1 + 0.9 * u), 0, 0, 6.2832);
            ctx!.fill();
          }
          const a = t - td;
          if (a > 0 && a < 0.6) {
            for (let q = 0; q < 2; q++) {
              const aq = a - q * 0.09;
              if (aq <= 0) continue;
              const rx = sc * (30 + 380 * aq) * (0.6 + vol * 0.4);
              ctx!.strokeStyle = K;
              ctx!.lineWidth = Math.max(1, sc * lerp(4, 0.8, aq / 0.5));
              ctx!.beginPath();
              ctx!.ellipse(mx, top, rx, sc * (8 + 60 * aq), 0, 0, 6.2832);
              ctx!.stroke();
              if (poolH > 1) {
                ctx!.beginPath();
                ctx!.ellipse(mx, by + poolH * 0.35, rx * 1.4, rx * 0.12, 0, 0, 6.2832);
                ctx!.stroke();
              }
            }
          }
        });

        if (t >= REV) {
          const d0 = (Math.max(vw, vh) * 0.9) / k0;
          const P = {
            dist: [] as number[],
            arc: [] as number[],
            dip: [] as number[],
            col: B,
            rot: -90 * (1 - ease((t - 5.3) / 0.4, 6)),
            rs: spr((t - 5.3) / 0.35, 8),
          };
          for (let i = 0; i < 4; i++) {
            const u = eIn((t - REV - 0.04 * i) / 0.5, 2);
            P.dist.push(d0 * (1 - u));
            P.arc.push(0.3 * d0 * Math.sin(Math.PI * u) * (1 - u));
            P.dip.push(dipF(t - (REV + 0.5 + 0.04 * i)));
          }
          drawMark(cx0, cy, k0, P);
        }
        ctx.restore();
      }

      if (grain) {
        grain.style.backgroundPosition =
          `${(Math.floor(t * 24) * 37) % 128}px ${(Math.floor(t * 24) * 61) % 128}px`;
      }
    }

    // Generate procedural grain background
    if (grain) {
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
    }

    // ---------- sound (optional, derived from the same simulation) ----------
    let ac: AudioContext | null = null;
    let soundOn = false;

    function schedule(t0_: number) {
      if (!ac || !soundOn) return;
      const now = ac.currentTime;
      const at = (u: number) => now + (u - t0_);
      const env = (g: GainNode, t: number, pk: number, dec: number) => {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(pk, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      };
      const tone = (u: number, f: number, pk: number, dec: number, f2?: number) => {
        if (u < t0_ || !ac) return;
        const o = ac.createOscillator();
        const g = ac.createGain();
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
        const b = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const s = ac.createBufferSource();
        const fl = ac.createBiquadFilter();
        const g = ac.createGain();
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
      noise(0.2, 2.6, 120, 420, 0.05);
      noise(2.9, 0.55, 400, 3500, 0.2);
      DROPS.forEach(([td, k, vol]) => {
        tone(td, 1500 / (0.6 + vol), 0.14, 0.35, 500 / (0.6 + vol));
        tone(td + 0.02, 700 - k * 60, 0.08 * vol, 1.2);
      });
      tone(5.45, 110, 0.3, 1.2, 55);
      [523.3, 659.3, 784].forEach((f) => tone(5.45, f, 0.06, 1.6));
    }

    const handleSndClick = () => {
      soundOn = !soundOn;
      if (snd) snd.setAttribute('aria-pressed', String(soundOn));
      if (soundOn) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          ac = ac || new AudioContextClass();
          ac.resume();
          if (phase === 'run') schedule(curT);
        } catch {
          soundOn = false;
          if (snd) snd.setAttribute('aria-pressed', 'false');
        }
      }
    };

    if (snd) {
      snd.addEventListener('click', handleSndClick);
    }

    // ---------- runtime ----------
    let phase = 'idle';
    let t0 = 0;
    let raf = 0;
    let dissolveTimeout = 0;

    // Safety timeout ensuring the intro never traps the application
    const safetyTimeout = window.setTimeout(() => {
      if (phase === 'run') {
        finish();
      }
    }, 7200);

    function finish() {
      if (phase !== 'run' && phase !== 'idle') return;
      phase = 'dissolve';
      render(END);
      if (intro) {
        intro.classList.add('off');
      }
      dissolveTimeout = window.setTimeout(() => {
        if (phase === 'dissolve') {
          phase = 'done';
          if (intro) intro.style.display = 'none';
          if (cv) cv.style.filter = 'none';
          try {
            sessionStorage.setItem('atrium-intro-seen', '1');
          } catch {}
          try {
            document.dispatchEvent(new CustomEvent('atrium:introcomplete'));
          } catch {}
          setIsVisible(false);
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
      if (!intro) return;
      intro.style.display = 'block';
      intro.style.transition = 'none';
      intro.classList.remove('off');
      void intro.offsetWidth;
      intro.style.transition = '';
      phase = 'run';

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

    const handleSkipClick = () => finish();
    if (skip) {
      skip.addEventListener('click', handleSkipClick);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', handleKeyDown);

    let rz = 0;
    const handleResize = () => {
      cancelAnimationFrame(rz);
      rz = requestAnimationFrame(() => {
        layout();
        render(curT);
      });
    };
    window.addEventListener('resize', handleResize);

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

    play();

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(rz);
      clearTimeout(safetyTimeout);
      clearTimeout(dissolveTimeout);
      if (ac && ac.state !== 'closed') {
        try {
          ac.close().catch(() => {});
        } catch {}
        ac = null;
      }
      if (snd) {
        snd.removeEventListener('click', handleSndClick);
      }
      if (skip) {
        skip.removeEventListener('click', handleSkipClick);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      if (cv) {
        cv.style.filter = 'none';
        cv.width = 0;
        cv.height = 0;
      }
      delete window.AtriumIntro;
    };
  }, [forcePlay, onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <style>{`
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
          color: #0a0a0a;
          background: rgba(255,255,255,.5);
          border: 1px solid rgba(10,10,10,.28);
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          min-height: 44px;
          min-width: 44px;
          border-radius: 999px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: background .3s, transform .3s cubic-bezier(.32,.72,0,1);
          z-index: 10;
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
