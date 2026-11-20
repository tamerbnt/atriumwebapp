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

import { syncSquircleNow } from '../../utils/squircle';

describe('60% squircle DOM overlay engine (syncSquircleNow)', () => {
  const installDomStub = (opts: {
    width: string;
    height: string;
    offsetWidth: number;
    offsetHeight: number;
    boxSizing?: string;
    borderWidth?: number;
    overflowX?: string;
    overflowY?: string;
    minWidth?: string;
  }) => {
    const attrs = new Map<string, string>();
    const svgAttrs = new Map<string, string>();
    const pathAttrs = new Map<string, string>();
    const svgStyleMap = new Map<string, string>();
    const bw = `${opts.borderWidth ?? 0}px`;

    const pathEl: any = {
      tagName: 'path',
      parentElement: null as any,
      setAttribute: (k: string, v: string) => pathAttrs.set(k, v),
      getAttribute: (k: string) => pathAttrs.get(k) ?? null,
    };
    const svgEl: any = {
      tagName: 'svg',
      children: [pathEl],
      parentElement: null as any,
      setAttribute: (k: string, v: string) => svgAttrs.set(k, v),
      getAttribute: (k: string) => svgAttrs.get(k) ?? null,
      querySelector: (sel: string) => (sel === 'path' ? pathEl : null),
      appendChild: (node: any) => {
        node.parentElement = svgEl;
        return node;
      },
      remove: () => {
        host.children = [];
      },
      style: {
        setProperty: (k: string, v: string) => svgStyleMap.set(k, v),
        removeProperty: (k: string) => svgStyleMap.delete(k),
        getPropertyValue: (k: string) => svgStyleMap.get(k) ?? '',
      },
    };
    const hostStyle: Record<string, string> = {
      overflow: opts.overflowX === 'hidden' && opts.overflowY === 'hidden' ? '' : '',
      minWidth: '',
    };
    const host: any = {
      tagName: 'DIV',
      isConnected: true,
      offsetWidth: opts.offsetWidth,
      offsetHeight: opts.offsetHeight,
      children: [] as any[],
      style: hostStyle,
      getAttribute: (k: string) => attrs.get(k) ?? null,
      setAttribute: (k: string, v: string) => attrs.set(k, v),
      removeAttribute: (k: string) => attrs.delete(k),
      hasAttribute: (k: string) => attrs.has(k),
      querySelector: (sel: string) =>
        sel === ':scope > svg[data-sq-stroke]' ? (host.children[0] ?? null) : null,
      appendChild: (node: any) => {
        node.parentElement = host;
        host.children.push(node);
        return node;
      },
      getBoundingClientRect: () => ({ width: opts.offsetWidth, height: opts.offsetHeight }),
    };
    svgEl.parentElement = host;

    const csMap = {
      width: opts.width,
      height: opts.height,
      boxSizing: opts.boxSizing ?? 'border-box',
      borderTopWidth: bw,
      borderRightWidth: bw,
      borderBottomWidth: bw,
      borderLeftWidth: bw,
      borderTopStyle: (opts.borderWidth ?? 0) > 0 ? 'solid' : 'none',
      paddingTop: '0px',
      paddingRight: '0px',
      paddingBottom: '0px',
      paddingLeft: '0px',
      position: 'relative',
      overflowX: opts.overflowX ?? 'visible',
      overflowY: opts.overflowY ?? 'visible',
      minWidth: opts.minWidth ?? 'auto',
      getPropertyValue: () => '',
    };

    const prevDocument = (globalThis as any).document;
    const prevWindow = (globalThis as any).window;
    const prevGetComputedStyle = (globalThis as any).getComputedStyle;

    (globalThis as any).window = {};
    (globalThis as any).document = {
      documentElement: {},
      createElementNS: (_ns: string, tag: string) => (tag === 'svg' ? svgEl : pathEl),
    };
    (globalThis as any).getComputedStyle = () => csMap;

    const cleanup = () => {
      (globalThis as any).document = prevDocument;
      (globalThis as any).window = prevWindow;
      (globalThis as any).getComputedStyle = prevGetComputedStyle;
    };

    return { host, attrs, svgEl, svgAttrs, pathAttrs, svgStyleMap, csMap, cleanup };
  };

  it('sets preserveAspectRatio="none" and border-box offset vars on bordered wide controls', () => {
    const { host, attrs, svgAttrs, svgStyleMap, cleanup } = installDomStub({
      width: '324px',
      height: '40px',
      offsetWidth: 324,
      offsetHeight: 40,
      borderWidth: 1,
    });
    try {
      attrs.set('data-sq', 'ctl');
      attrs.set('data-sq-border', 'solid');
      syncSquircleNow(host);

      expect(svgAttrs.get('preserveAspectRatio')).toBe('none');
      expect(svgAttrs.get('viewBox')).toBe('0 0 324 40');
      expect(svgStyleMap.get('--sq-bt')).toBe('1px');
      expect(svgStyleMap.get('--sq-br')).toBe('1px');
      expect(svgStyleMap.get('--sq-bb')).toBe('1px');
      expect(svgStyleMap.get('--sq-bl')).toBe('1px');
    } finally {
      cleanup();
    }
  });

  it('releases overflow:hidden when border-width > 0 and restores on data-sq="none"', () => {
    const { host, attrs, csMap, cleanup } = installDomStub({
      width: '414px',
      height: '273px',
      offsetWidth: 414,
      offsetHeight: 273,
      borderWidth: 1,
      overflowX: 'hidden',
      overflowY: 'hidden',
      minWidth: 'auto',
    });
    try {
      attrs.set('data-sq', 'card');
      attrs.set('data-sq-border', 'solid');
      syncSquircleNow(host);

      expect(host.style.overflow).toBe('visible');
      expect(host.style.minWidth).toBe('0px');
      expect(host.style.clipPath).toMatch(/^path\('/);

      csMap.overflowX = 'visible';
      csMap.overflowY = 'visible';
      attrs.set('data-sq', 'none');
      syncSquircleNow(host);
      expect(host.style.clipPath).toBe('');
      expect(host.style.overflow).toBe('');
      expect(host.style.minWidth).toBe('');
    } finally {
      cleanup();
    }
  });

  it('uses fractional CSS border-box width on 3-column grids instead of integer offsetWidth', () => {
    const { host, attrs, svgAttrs, cleanup } = installDomStub({
      width: '449.33px',
      height: '132px',
      offsetWidth: 449,
      offsetHeight: 132,
      borderWidth: 0,
    });
    try {
      attrs.set('data-sq', 'card');
      attrs.set('data-sq-border', 'solid');
      syncSquircleNow(host);

      expect(svgAttrs.get('viewBox')).toBe('0 0 449.33 132');
      expect(host.style.clipPath).toContain('449.33');
    } finally {
      cleanup();
    }
  });

  it('preserves overflow-y:auto on scrollable containers even when bordered', () => {
    const { host, attrs, cleanup } = installDomStub({
      width: '560px',
      height: '480px',
      offsetWidth: 560,
      offsetHeight: 480,
      borderWidth: 1,
      overflowX: 'visible',
      overflowY: 'auto',
    });
    try {
      attrs.set('data-sq', 'panel');
      attrs.set('data-sq-border', 'solid');
      syncSquircleNow(host);

      expect(host.style.overflow).toBe('');
    } finally {
      cleanup();
    }
  });
});

