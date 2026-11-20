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
}

const cachedEntries = new WeakMap<HTMLElement, CachedEntry>();
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

function resolveRadiusPx(el: HTMLElement, rootTokens: Record<string, number>): number {
  const attr = el.getAttribute('data-sq');
  if (!attr || attr === 'none') return 0;
  if (attr in rootTokens) {
    return rootTokens[attr];
  }
  const numeric = parseFloat(attr);
  if (!Number.isNaN(numeric) && numeric >= 0) {
    return numeric;
  }
  const inlineVar = parseFloat(getComputedStyle(el).getPropertyValue('--sq-r'));
  if (!Number.isNaN(inlineVar) && inlineVar >= 0) {
    return inlineVar;
  }
  return TOKEN_DEFAULTS.card;
}

function resolveStrokeWidth(el: HTMLElement): { needsStroke: boolean; strokeWidth: number } {
  const borderMode = el.getAttribute('data-sq-border');
  if (borderMode === 'none') {
    return { needsStroke: false, strokeWidth: 0 };
  }
  const explicitW = parseFloat(el.getAttribute('data-sq-stroke-w') || '');
  if (borderMode === 'solid' || borderMode === 'dashed') {
    return {
      needsStroke: true,
      strokeWidth: !Number.isNaN(explicitW) && explicitW > 0 ? explicitW : 1,
    };
  }
  // Auto-detect from borderTopWidth or dashed style if data-sq-border not explicitly set
  const cs = getComputedStyle(el);
  const bw = parseFloat(cs.borderTopWidth) || 0;
  const hasVarStroke = cs.getPropertyValue('--sq-stroke').trim() !== '';
  if (bw > 0 || hasVarStroke) {
    if (cs.borderTopStyle === 'dashed' && el.getAttribute('data-sq-dash') === null) {
      el.setAttribute('data-sq-dash', '');
    }
    return { needsStroke: true, strokeWidth: bw > 0 ? bw : 1 };
  }
  return { needsStroke: false, strokeWidth: 0 };
}

const VOID_TAGS = new Set(['INPUT', 'IMG', 'TEXTAREA', 'SELECT', 'BR', 'HR']);

function ensureStrokeOverlay(el: HTMLElement): SVGPathElement | null {
  if (VOID_TAGS.has(el.tagName)) return null;
  let svg = el.querySelector<SVGSVGElement>(':scope > svg[data-sq-stroke]');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('data-sq-stroke', '');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);
    el.appendChild(svg);
    return path;
  }
  let path = svg.querySelector<SVGPathElement>('path');
  if (!path) {
    path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
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

interface PendingWrite {
  el: HTMLElement;
  w: number;
  h: number;
  r: number;
  s: number;
  strokeWidth: number;
  needsStroke: boolean;
  needsPosRelative: boolean;
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
      el.style.webkitClipPath = '';
      removeStrokeOverlay(el);
      cachedEntries.delete(el);
      return;
    }

    const w = el.offsetWidth || Math.round(el.getBoundingClientRect().width);
    const h = el.offsetHeight || Math.round(el.getBoundingClientRect().height);
    if (w <= 0 || h <= 0) return;

    const r = resolveRadiusPx(el, tokens);
    const { needsStroke, strokeWidth } = resolveStrokeWidth(el);
    const needsPosRelative =
      needsStroke && !VOID_TAGS.has(el.tagName) && getComputedStyle(el).position === 'static';

    const prev = cachedEntries.get(el);
    if (
      prev &&
      prev.w === w &&
      prev.h === h &&
      prev.r === r &&
      prev.s === smooth &&
      prev.strokeWidth === strokeWidth &&
      prev.needsStroke === needsStroke
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
      const inset = Math.max(0.5, strokeWidth / 2);
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
      needsPosRelative,
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
      needsPosRelative,
      clipPathStr,
      strokePathStr,
    } = item;

    if (needsPosRelative) {
      el.style.position = 'relative';
    }
    el.style.clipPath = clipPathStr;
    (el.style as any).webkitClipPath = clipPathStr;
    cachedEntries.set(el, { w, h, r, s, strokeWidth, needsStroke });

    if (needsStroke && strokePathStr) {
      const pathEl = ensureStrokeOverlay(el);
      if (pathEl) {
        const svg = pathEl.parentElement as unknown as SVGSVGElement;
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
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
  const attr = el.getAttribute('data-sq');
  if (!attr || attr === 'none') return;
  const w = el.offsetWidth || Math.round(el.getBoundingClientRect().width);
  const h = el.offsetHeight || Math.round(el.getBoundingClientRect().height);
  if (w <= 0 || h <= 0) return;

  const { smooth, tokens } = readRootTokens();
  const r = resolveRadiusPx(el, tokens);
  const { needsStroke, strokeWidth } = resolveStrokeWidth(el);
  const needsPosRelative =
    needsStroke && !VOID_TAGS.has(el.tagName) && getComputedStyle(el).position === 'static';

  const prev = cachedEntries.get(el);
  if (
    prev &&
    prev.w === w &&
    prev.h === h &&
    prev.r === r &&
    prev.s === smooth &&
    prev.strokeWidth === strokeWidth &&
    prev.needsStroke === needsStroke
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
  const clipStr = `path('${outerD}')`;
  el.style.clipPath = clipStr;
  (el.style as any).webkitClipPath = clipStr;

  if (needsStroke) {
    const inset = Math.max(0.5, strokeWidth / 2);
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
      pathEl.setAttribute('d', strokeD);
    }
  } else {
    removeStrokeOverlay(el);
  }

  cachedEntries.set(el, { w, h, r, s: smooth, strokeWidth, needsStroke });
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
