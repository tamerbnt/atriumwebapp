import { useEffect } from 'react';
import type { RefObject } from 'react';
import { squirclePath } from '@/atrium/motion/shapes';

export type SquircleToken =
  | 'app'
  | 'panel'
  | 'card'
  | 'table'
  | 'row'
  | 'ctl'
  | 'ctl-sm'
  | 'thumb'
  | 'tile'
  | 'tile-lg'
  | 'check'
  | 'empty';

export type SquircleBorderMode = 'solid' | 'dashed' | 'none';

const TOKEN_DEFAULTS: Record<SquircleToken, number> = {
  app: 40,
  panel: 28,
  card: 16,
  table: 20,
  row: 12,
  ctl: 12,
  'ctl-sm': 10,
  thumb: 9,
  tile: 12,
  'tile-lg': 15,
  check: 6,
  empty: 12,
};

interface CachedEntry {
  w: number;
  h: number;
  r: number;
  s: number;
  strokeWidth: number;
  needsStroke: boolean;
  bt: number;
  br: number;
  bb: number;
  bl: number;
  overflowAdjusted: boolean;
}

interface SavedOverflowStyle {
  overflow: string;
  minWidth: string;
}

const cachedEntries = new WeakMap<HTMLElement, CachedEntry>();
const savedOverflowStyles = new WeakMap<HTMLElement, SavedOverflowStyle>();
const trackedElements = new Set<HTMLElement>();
const dirtyQueue = new Set<HTMLElement>();

let ro: ResizeObserver | null = null;
let mo: MutationObserver | null = null;
let rafId: number | null = null;
let rootTokensCache: { smooth: number; tokens: Record<string, number> } | null = null;

function readRootTokens(): { smooth: number; tokens: Record<string, number> } {
  if (rootTokensCache) return rootTokensCache;
  const fallback: { smooth: number; tokens: Record<string, number> } = {
    smooth: 0.6,
    tokens: { ...TOKEN_DEFAULTS },
  };
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback;
  }
  const cs = getComputedStyle(document.documentElement);
  const smoothRaw = parseFloat(cs.getPropertyValue('--sq-smooth'));
  if (!Number.isNaN(smoothRaw) && smoothRaw >= 0) {
    fallback.smooth = smoothRaw;
  }
  (Object.keys(TOKEN_DEFAULTS) as SquircleToken[]).forEach((key) => {
    const val = parseFloat(cs.getPropertyValue(`--r-${key}`));
    if (!Number.isNaN(val) && val >= 0) {
      fallback.tokens[key] = val;
    }
  });
  rootTokensCache = fallback;
  return fallback;
}

/** Clear cached CSS token values (useful if root CSS tokens change at runtime). */
export function invalidateSquircleTokenCache(): void {
  rootTokensCache = null;
  trackedElements.forEach((el) => enqueueSquircleElement(el));
}

function roundSubpx(v: number): number {
  return Math.round(v * 100) / 100;
}

interface BorderBoxMetrics {
  w: number;
  h: number;
  bt: number;
  br: number;
  bb: number;
  bl: number;
}

function measureBorderBox(el: HTMLElement, cs: CSSStyleDeclaration): BorderBoxMetrics {
  const bt = parseFloat(cs.borderTopWidth) || 0;
  const br = parseFloat(cs.borderRightWidth) || 0;
  const bb = parseFloat(cs.borderBottomWidth) || 0;
  const bl = parseFloat(cs.borderLeftWidth) || 0;

  const offW = el.offsetWidth;
  const offH = el.offsetHeight;
  const cssW = parseFloat(cs.width);
  const cssH = parseFloat(cs.height);

  let w = 0;
  let h = 0;

  if (Number.isFinite(cssW) && cssW > 0) {
    const padX =
      cs.boxSizing === 'border-box'
        ? 0
        : (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) + bl + br;
    const candidateW = cssW + padX;
    if (offW === 0 || Math.abs(candidateW - offW) <= 1.5) {
      w = roundSubpx(candidateW);
    }
  }
  if (Number.isFinite(cssH) && cssH > 0) {
    const padY =
      cs.boxSizing === 'border-box'
        ? 0
        : (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) + bt + bb;
    const candidateH = cssH + padY;
    if (offH === 0 || Math.abs(candidateH - offH) <= 1.5) {
      h = roundSubpx(candidateH);
    }
  }

  if (w <= 0) {
    w = offW || roundSubpx(el.getBoundingClientRect().width);
  }
  if (h <= 0) {
    h = offH || roundSubpx(el.getBoundingClientRect().height);
  }

  return { w, h, bt, br, bb, bl };
}

function resolveRadiusPx(
  el: HTMLElement,
  rootTokens: Record<string, number>,
  cs: CSSStyleDeclaration,
): number {
  const attr = el.getAttribute('data-sq');
  if (!attr || attr === 'none') return 0;
  if (attr in rootTokens) {
    return rootTokens[attr];
  }
  const numeric = parseFloat(attr);
  if (!Number.isNaN(numeric) && numeric >= 0) {
    return numeric;
  }
  const inlineVar = parseFloat(cs.getPropertyValue('--sq-r'));
  if (!Number.isNaN(inlineVar) && inlineVar >= 0) {
    return inlineVar;
  }
  return TOKEN_DEFAULTS.card;
}

function resolveStrokeWidth(
  el: HTMLElement,
  cs: CSSStyleDeclaration,
  bt: number,
  br: number,
  bb: number,
  bl: number,
): { needsStroke: boolean; strokeWidth: number } {
  const borderMode = el.getAttribute('data-sq-border');
  if (borderMode === 'none') {
    return { needsStroke: false, strokeWidth: 0 };
  }
  const explicitW = parseFloat(el.getAttribute('data-sq-stroke-w') || '');
  const maxBw = Math.max(bt, br, bb, bl);
  if (borderMode === 'solid' || borderMode === 'dashed') {
    const detected = bt > 0 ? bt : maxBw;
    return {
      needsStroke: true,
      strokeWidth: !Number.isNaN(explicitW) && explicitW > 0 ? explicitW : detected > 0 ? detected : 1,
    };
  }
  // Auto-detect full-box border or explicit --sq-stroke token
  const hasFullBorder = bt > 0 && br > 0 && bb > 0 && bl > 0;
  const hasVarStroke = cs.getPropertyValue('--sq-stroke').trim() !== '';
  if (hasFullBorder || hasVarStroke) {
    if (cs.borderTopStyle === 'dashed' && el.getAttribute('data-sq-dash') === null) {
      el.setAttribute('data-sq-dash', '');
    }
    return {
      needsStroke: true,
      strokeWidth: !Number.isNaN(explicitW) && explicitW > 0 ? explicitW : bt > 0 ? bt : 1,
    };
  }
  return { needsStroke: false, strokeWidth: 0 };
}

const VOID_TAGS = new Set(['INPUT', 'IMG', 'TEXTAREA', 'SELECT', 'BR', 'HR']);
const SVG_NS = 'http://www.w3.org/2000/svg';
const SHARED_DEFS_ID = 'atrium-sq-defs';

interface SpecularGradientSpec {
  id: string;
  stops: ReadonlyArray<{ offset: string; opacity: number }>;
}

export function computeFlushStrokeInset(strokeWidth: number): number {
  if (!Number.isFinite(strokeWidth) || strokeWidth <= 0) return 0;
  return Math.round(strokeWidth * 0.5 * 100) / 100;
}

function getOpticalHairlinePx(el: HTMLElement, cs: CSSStyleDeclaration, strokeWidth: number): number {
  const hasExplicitAttr = el.getAttribute('data-sq-stroke-w') !== null;
  if (hasExplicitAttr || strokeWidth > 1) return strokeWidth;
  const cssW = parseFloat(cs.getPropertyValue('--sq-stroke-w'));
  if (Number.isFinite(cssW) && cssW > 0) return cssW;
  const dpr = typeof window !== 'undefined' ? Number(window.devicePixelRatio) || 1 : 1;
  return dpr >= 2 ? 0.65 : strokeWidth;
}

export const DARK_SPECULAR_GRADIENTS: ReadonlyArray<SpecularGradientSpec> = [
  {
    id: 'sq-spec-dark-pod',
    stops: [
      { offset: '0%', opacity: 0.045 },
      { offset: '8%', opacity: 0.02 },
      { offset: '24%', opacity: 0.005 },
      { offset: '55%', opacity: 0 },
      { offset: '100%', opacity: 0 },
    ],
  },
  {
    id: 'sq-spec-dark-card',
    stops: [
      { offset: '0%', opacity: 0.115 },
      { offset: '8%', opacity: 0.055 },
      { offset: '22%', opacity: 0.012 },
      { offset: '50%', opacity: 0.002 },
      { offset: '100%', opacity: 0 },
    ],
  },
  {
    id: 'sq-spec-dark-ctl',
    stops: [
      { offset: '0%', opacity: 0.135 },
      { offset: '8%', opacity: 0.065 },
      { offset: '24%', opacity: 0.015 },
      { offset: '52%', opacity: 0.003 },
      { offset: '100%', opacity: 0 },
    ],
  },
  {
    id: 'sq-spec-dark-ctl-hover',
    stops: [
      { offset: '0%', opacity: 0.21 },
      { offset: '8%', opacity: 0.105 },
      { offset: '26%', opacity: 0.025 },
      { offset: '55%', opacity: 0.005 },
      { offset: '100%', opacity: 0 },
    ],
  },
  {
    id: 'sq-spec-dark-pop',
    stops: [
      { offset: '0%', opacity: 0.15 },
      { offset: '8%', opacity: 0.075 },
      { offset: '24%', opacity: 0.018 },
      { offset: '55%', opacity: 0.004 },
      { offset: '100%', opacity: 0 },
    ],
  },
  {
    id: 'sq-spec-dark-app',
    stops: [
      { offset: '0%', opacity: 0.06 },
      { offset: '8%', opacity: 0.025 },
      { offset: '22%', opacity: 0.005 },
      { offset: '50%', opacity: 0 },
      { offset: '100%', opacity: 0 },
    ],
  },
];

let defsInjected = false;

/**
 * Mounts one inert hidden <svg> <defs> sprite containing shared top-lit white
 * specular gradients so dark cards, pods, controls, and overlays can share
 * gradient paint servers with zero per-element DOM duplication.
 * Note: Never uses display:none or visibility:hidden (browsers skip paint servers).
 */
export function ensureSharedSquircleDefs(): void {
  if (defsInjected || typeof document === 'undefined') return;
  if (typeof document.getElementById !== 'function' || typeof document.createElementNS !== 'function') {
    return;
  }
  const host = document.body || document.documentElement;
  if (!host || typeof host.appendChild !== 'function') return;

  if (document.getElementById(SHARED_DEFS_ID)) {
    defsInjected = true;
    return;
  }

  const sprite = document.createElementNS(SVG_NS, 'svg');
  sprite.setAttribute('id', SHARED_DEFS_ID);
  sprite.setAttribute('aria-hidden', 'true');
  sprite.setAttribute('width', '0');
  sprite.setAttribute('height', '0');
  sprite.style.position = 'fixed';
  sprite.style.top = '-9999px';
  sprite.style.left = '-9999px';
  sprite.style.width = '0';
  sprite.style.height = '0';
  sprite.style.overflow = 'hidden';
  sprite.style.pointerEvents = 'none';

  const defs = document.createElementNS(SVG_NS, 'defs');
  for (let i = 0; i < DARK_SPECULAR_GRADIENTS.length; i++) {
    const spec = DARK_SPECULAR_GRADIENTS[i];
    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    grad.setAttribute('id', spec.id);
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', '1');

    for (let j = 0; j < spec.stops.length; j++) {
      const st = spec.stops[j];
      const stopEl = document.createElementNS(SVG_NS, 'stop');
      stopEl.setAttribute('offset', st.offset);
      stopEl.setAttribute('stop-color', '#ffffff');
      stopEl.setAttribute('stop-opacity', String(st.opacity));
      grad.appendChild(stopEl);
    }
    defs.appendChild(grad);
  }

  sprite.appendChild(defs);
  host.appendChild(sprite);
  defsInjected = true;
}

function ensureStrokeOverlay(el: HTMLElement): SVGPathElement | null {
  if (VOID_TAGS.has(el.tagName)) return null;
  let svg = el.querySelector<SVGSVGElement>(':scope > svg[data-sq-stroke]');
  if (!svg) {
    svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('data-sq-stroke', '');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('preserveAspectRatio', 'none');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);
    el.appendChild(svg);
    return path;
  }
  if (svg.getAttribute('preserveAspectRatio') !== 'none') {
    svg.setAttribute('preserveAspectRatio', 'none');
  }
  let path = svg.querySelector<SVGPathElement>('path');
  if (!path) {
    path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);
  }
  return path;
}

function removeStrokeOverlay(el: HTMLElement): void {
  const svg = el.querySelector<SVGSVGElement>(':scope > svg[data-sq-stroke]');
  if (svg) svg.remove();
}

function restoreOverflowStyle(el: HTMLElement): void {
  const saved = savedOverflowStyles.get(el);
  if (!saved) return;
  el.style.overflow = saved.overflow;
  el.style.minWidth = saved.minWidth;
  savedOverflowStyles.delete(el);
}

function applyStrokeBoxVars(
  svg: SVGSVGElement,
  bt: number,
  br: number,
  bb: number,
  bl: number,
): void {
  if (bt === 0 && br === 0 && bb === 0 && bl === 0) {
    svg.style.removeProperty('--sq-bt');
    svg.style.removeProperty('--sq-br');
    svg.style.removeProperty('--sq-bb');
    svg.style.removeProperty('--sq-bl');
    return;
  }
  svg.style.setProperty('--sq-bt', `${bt}px`);
  svg.style.setProperty('--sq-br', `${br}px`);
  svg.style.setProperty('--sq-bb', `${bb}px`);
  svg.style.setProperty('--sq-bl', `${bl}px`);
}

interface PendingWrite {
  el: HTMLElement;
  w: number;
  h: number;
  r: number;
  s: number;
  strokeWidth: number;
  needsStroke: boolean;
  bt: number;
  br: number;
  bb: number;
  bl: number;
  needsPosRelative: boolean;
  needsOverflowRelease: boolean;
  needsMinWidthZero: boolean;
  wasOverflowAdjusted: boolean;
  clipPathStr: string;
  strokePathStr: string;
}

function flushDirtyQueue(): void {
  rafId = null;
  if (dirtyQueue.size === 0) return;

  const { smooth, tokens } = readRootTokens();
  const writes: PendingWrite[] = [];

  // Phase A: Batch all DOM reads together before any writes (zero layout thrash)
  dirtyQueue.forEach((el) => {
    if (!el.isConnected) {
      trackedElements.delete(el);
      ro?.unobserve(el);
      return;
    }
    const attr = el.getAttribute('data-sq');
    if (!attr || attr === 'none') {
      el.style.clipPath = '';
      (el.style as any).webkitClipPath = '';
      removeStrokeOverlay(el);
      restoreOverflowStyle(el);
      cachedEntries.delete(el);
      return;
    }

    const cs = getComputedStyle(el);
    const { w, h, bt, br, bb, bl } = measureBorderBox(el, cs);
    if (w <= 0 || h <= 0) return;

    const r = resolveRadiusPx(el, tokens, cs);
    const { needsStroke, strokeWidth: rawStrokeWidth } = resolveStrokeWidth(el, cs, bt, br, bb, bl);
    const strokeWidth = needsStroke ? getOpticalHairlinePx(el, cs, rawStrokeWidth) : 0;
    const isVoid = VOID_TAGS.has(el.tagName);
    const needsPosRelative = needsStroke && !isVoid && cs.position === 'static';
    const hasNonZeroBorder = bt > 0 || br > 0 || bb > 0 || bl > 0;
    const prev = cachedEntries.get(el);
    const wasOverflowAdjusted = Boolean(prev?.overflowAdjusted);
    // When overflow:hidden is set on a bordered [data-sq] host, CSS clips children to the padding box,
    // which would slice away the outer border-box stroke; clip-path already clips at the squircle border-box.
    const needsOverflowRelease =
      needsStroke &&
      !isVoid &&
      hasNonZeroBorder &&
      ((cs.overflowX === 'hidden' && cs.overflowY === 'hidden') || wasOverflowAdjusted);
    const needsMinWidthZero = needsOverflowRelease && cs.minWidth === 'auto';

    if (
      prev &&
      prev.w === w &&
      prev.h === h &&
      prev.r === r &&
      prev.s === smooth &&
      prev.strokeWidth === strokeWidth &&
      prev.needsStroke === needsStroke &&
      prev.bt === bt &&
      prev.br === br &&
      prev.bb === bb &&
      prev.bl === bl &&
      prev.overflowAdjusted === needsOverflowRelease
    ) {
      if (needsPosRelative) {
        el.style.position = 'relative';
      }
      return;
    }

    const outerD = squirclePath(0, 0, w, h, r, smooth);
    if (!outerD) return;

    let strokeD = '';
    if (needsStroke) {
      const inset = computeFlushStrokeInset(strokeWidth);
      const sw = Math.max(1, w - inset * 2);
      const sh = Math.max(1, h - inset * 2);
      const sr = Math.max(0, r - inset);
      strokeD = squirclePath(inset, inset, sw, sh, sr, smooth);
    }

    writes.push({
      el,
      w,
      h,
      r,
      s: smooth,
      strokeWidth,
      needsStroke,
      bt,
      br,
      bb,
      bl,
      needsPosRelative,
      needsOverflowRelease,
      needsMinWidthZero,
      wasOverflowAdjusted,
      clipPathStr: `path('${outerD}')`,
      strokePathStr: strokeD,
    });
  });

  dirtyQueue.clear();

  // Phase B: Batch all DOM writes together
  for (let i = 0; i < writes.length; i++) {
    const item = writes[i];
    const {
      el,
      w,
      h,
      r,
      s,
      strokeWidth,
      needsStroke,
      bt,
      br,
      bb,
      bl,
      needsPosRelative,
      needsOverflowRelease,
      needsMinWidthZero,
      wasOverflowAdjusted,
      clipPathStr,
      strokePathStr,
    } = item;

    if (needsPosRelative) {
      el.style.position = 'relative';
    }
    if (needsOverflowRelease) {
      if (!savedOverflowStyles.has(el)) {
        savedOverflowStyles.set(el, {
          overflow: el.style.overflow,
          minWidth: el.style.minWidth,
        });
      }
      el.style.overflow = 'visible';
      if (needsMinWidthZero) {
        el.style.minWidth = '0px';
      }
    } else if (wasOverflowAdjusted) {
      restoreOverflowStyle(el);
    }

    el.style.clipPath = clipPathStr;
    (el.style as any).webkitClipPath = clipPathStr;
    cachedEntries.set(el, {
      w,
      h,
      r,
      s,
      strokeWidth,
      needsStroke,
      bt,
      br,
      bb,
      bl,
      overflowAdjusted: needsOverflowRelease,
    });

    if (needsStroke && strokePathStr) {
      const pathEl = ensureStrokeOverlay(el);
      if (pathEl) {
        const svg = pathEl.parentElement as unknown as SVGSVGElement;
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
        applyStrokeBoxVars(svg, bt, br, bb, bl);
        pathEl.setAttribute('d', strokePathStr);
      }
    } else {
      removeStrokeOverlay(el);
    }
  }
}

export function enqueueSquircleElement(el: HTMLElement): void {
  dirtyQueue.add(el);
  if (rafId === null && typeof requestAnimationFrame !== 'undefined') {
    rafId = requestAnimationFrame(flushDirtyQueue);
  }
}

/** Immediately synchronize a single element synchronously (e.g., inside transition frames). */
export function syncSquircleNow(el: HTMLElement | null): void {
  if (!el || !el.isConnected) return;
  ensureSharedSquircleDefs();
  const attr = el.getAttribute('data-sq');
  if (!attr || attr === 'none') {
    el.style.clipPath = '';
    (el.style as any).webkitClipPath = '';
    removeStrokeOverlay(el);
    restoreOverflowStyle(el);
    cachedEntries.delete(el);
    return;
  }

  const cs = getComputedStyle(el);
  const { w, h, bt, br, bb, bl } = measureBorderBox(el, cs);
  if (w <= 0 || h <= 0) return;

  const { smooth, tokens } = readRootTokens();
  const r = resolveRadiusPx(el, tokens, cs);
  const { needsStroke, strokeWidth: rawStrokeWidth } = resolveStrokeWidth(el, cs, bt, br, bb, bl);
  const strokeWidth = needsStroke ? getOpticalHairlinePx(el, cs, rawStrokeWidth) : 0;
  const isVoid = VOID_TAGS.has(el.tagName);
  const needsPosRelative = needsStroke && !isVoid && cs.position === 'static';
  const hasNonZeroBorder = bt > 0 || br > 0 || bb > 0 || bl > 0;
  const prev = cachedEntries.get(el);
  const wasOverflowAdjusted = Boolean(prev?.overflowAdjusted);
  const needsOverflowRelease =
    needsStroke &&
    !isVoid &&
    hasNonZeroBorder &&
    ((cs.overflowX === 'hidden' && cs.overflowY === 'hidden') || wasOverflowAdjusted);
  const needsMinWidthZero = needsOverflowRelease && cs.minWidth === 'auto';

  if (
    prev &&
    prev.w === w &&
    prev.h === h &&
    prev.r === r &&
    prev.s === smooth &&
    prev.strokeWidth === strokeWidth &&
    prev.needsStroke === needsStroke &&
    prev.bt === bt &&
    prev.br === br &&
    prev.bb === bb &&
    prev.bl === bl &&
    prev.overflowAdjusted === needsOverflowRelease
  ) {
    if (needsPosRelative) {
      el.style.position = 'relative';
    }
    return;
  }

  const outerD = squirclePath(0, 0, w, h, r, smooth);
  if (!outerD) return;
  if (needsPosRelative) {
    el.style.position = 'relative';
  }
  if (needsOverflowRelease) {
    if (!savedOverflowStyles.has(el)) {
      savedOverflowStyles.set(el, {
        overflow: el.style.overflow,
        minWidth: el.style.minWidth,
      });
    }
    el.style.overflow = 'visible';
    if (needsMinWidthZero) {
      el.style.minWidth = '0px';
    }
  } else if (wasOverflowAdjusted) {
    restoreOverflowStyle(el);
  }

  const clipStr = `path('${outerD}')`;
  el.style.clipPath = clipStr;
  (el.style as any).webkitClipPath = clipStr;

  if (needsStroke) {
    const inset = computeFlushStrokeInset(strokeWidth);
    const strokeD = squirclePath(
      inset,
      inset,
      Math.max(1, w - inset * 2),
      Math.max(1, h - inset * 2),
      Math.max(0, r - inset),
      smooth,
    );
    const pathEl = ensureStrokeOverlay(el);
    if (pathEl && strokeD) {
      const svg = pathEl.parentElement as unknown as SVGSVGElement;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      applyStrokeBoxVars(svg, bt, br, bb, bl);
      pathEl.setAttribute('d', strokeD);
    }
  } else {
    removeStrokeOverlay(el);
  }

  cachedEntries.set(el, {
    w,
    h,
    r,
    s: smooth,
    strokeWidth,
    needsStroke,
    bt,
    br,
    bb,
    bl,
    overflowAdjusted: needsOverflowRelease,
  });
}

function registerNode(el: HTMLElement): void {
  if (!trackedElements.has(el)) {
    trackedElements.add(el);
    ro?.observe(el);
  }
  enqueueSquircleElement(el);
}

function unregisterNode(el: HTMLElement): void {
  if (trackedElements.has(el)) {
    trackedElements.delete(el);
    ro?.unobserve(el);
  }
  dirtyQueue.delete(el);
  cachedEntries.delete(el);
  savedOverflowStyles.delete(el);
}

function scanSubtree(root: ParentNode): void {
  if (root instanceof HTMLElement && root.hasAttribute('data-sq')) {
    registerNode(root);
  }
  if ('querySelectorAll' in root) {
    const nodes = root.querySelectorAll<HTMLElement>('[data-sq]');
    for (let i = 0; i < nodes.length; i++) {
      registerNode(nodes[i]);
    }
  }
}

let engineInstalled = false;

/**
 * Installs the global singleton ResizeObserver + MutationObserver + fonts-ready resync
 * for every `[data-sq]` element across the entire application. Safe to call multiple times.
 */
export function initSquircleEngine(): void {
  if (engineInstalled || typeof window === 'undefined' || typeof document === 'undefined') return;
  engineInstalled = true;
  ensureSharedSquircleDefs();

  const dpr = Number(window.devicePixelRatio) || 1;
  if (document.documentElement?.style?.setProperty) {
    document.documentElement.style.setProperty('--sq-stroke-hairline', dpr >= 2 ? '0.65px' : '1px');
  }

  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver((entries) => {
      for (let i = 0; i < entries.length; i++) {
        const target = entries[i].target;
        if (target instanceof HTMLElement) {
          enqueueSquircleElement(target);
        }
      }
    });
  }

  scanSubtree(document.body || document.documentElement);

  if (typeof MutationObserver !== 'undefined') {
    mo = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type === 'attributes') {
          if (m.target instanceof HTMLElement) {
            if (m.target.hasAttribute('data-sq')) {
              registerNode(m.target);
            } else {
              m.target.style.clipPath = '';
              (m.target.style as any).webkitClipPath = '';
              removeStrokeOverlay(m.target);
              restoreOverflowStyle(m.target);
              unregisterNode(m.target);
            }
          }
          continue;
        }
        for (let j = 0; j < m.addedNodes.length; j++) {
          const node = m.addedNodes[j];
          if (node instanceof HTMLElement) {
            scanSubtree(node);
          }
        }
        for (let j = 0; j < m.removedNodes.length; j++) {
          const node = m.removedNodes[j];
          if (node instanceof HTMLElement) {
            if (trackedElements.has(node)) unregisterNode(node);
            const children = node.querySelectorAll<HTMLElement>('[data-sq]');
            for (let k = 0; k < children.length; k++) {
              unregisterNode(children[k]);
            }
          }
        }
      }
    });

    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-sq', 'data-sq-border', 'data-sq-stroke-w', 'data-sq-dash'],
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      invalidateSquircleTokenCache();
    });
  }
}

/**
 * React helper hook to ensure an imperative ref node gets synced immediately on mount/updates.
 */
export function useSquircle(
  ref: RefObject<HTMLElement | null>,
  token: SquircleToken | number | 'none',
  border: SquircleBorderMode = 'solid',
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (token === 'none') {
      el.removeAttribute('data-sq');
      return;
    }
    el.setAttribute('data-sq', String(token));
    el.setAttribute('data-sq-border', border);
    registerNode(el);
    syncSquircleNow(el);
    return () => {
      unregisterNode(el);
    };
  }, [ref, token, border]);
}
