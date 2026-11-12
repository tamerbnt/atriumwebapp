/**
 * Pure Math, Constants, and Geometry Calculators for Adherents Motion
 * Zero DOM / React dependencies — testable directly in Node (`node:test` / Vitest).
 */

export const ROW_H = 62;
export const ROW_G = 8;
export const ROW_DH = 150;
export const ROW_B = 38;
export const CARD_H = 172;

export const TUNES = {
  rowPresence: 24,
  rowExpand: 26,
  rowPosition: 22,
  panel: 24,
  tabIndicator: 26,
  modal: 28,
  bulkBar: 26,
  toast: 26,
  metricCountUp: 20,
} as const;

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

export function computeSpringCoefficients(tune: number): { k: number; d: number } {
  return {
    k: 0.08 + (tune / 100) * 0.16,
    d: 0.62 + (tune / 100) * 0.2,
  };
}

export interface RowTargetPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
  eTarget: number;
}

/**
 * Computes list ('l' | 'list') or grid ('g' | 'grid') target placements and total container height.
 */
export function computeRowTargets(
  ids: readonly string[],
  expandedSet: ReadonlySet<string>,
  containerWidth: number,
  viewMode: 'list' | 'grid' | 'l' | 'g'
): { targets: Map<string, RowTargetPlacement>; totalHeight: number } {
  const W = Math.max(300, containerWidth || 1200);
  const cw = (W - 2 * ROW_G) / 3;
  const isList = viewMode === 'l' || viewMode === 'list';
  let y = 0;

  const targets = new Map<string, RowTargetPlacement>();

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (isList) {
      const exp = expandedSet.has(id);
      const yy = y;
      y += ROW_H + ROW_G + (exp ? ROW_DH + ROW_G : 0);
      targets.set(id, {
        x: 0,
        y: yy,
        w: W,
        h: ROW_H,
        eTarget: exp ? 100 : 0,
      });
    } else {
      const x = (i % 3) * (cw + ROW_G);
      const yy = Math.floor(i / 3) * (CARD_H + ROW_G);
      targets.set(id, {
        x,
        y: yy,
        w: cw,
        h: CARD_H,
        eTarget: 0,
      });
    }
  }

  const totalHeight = isList ? y : Math.ceil(ids.length / 3) * (CARD_H + ROW_G);
  return { targets, totalHeight };
}

export interface RowVisualGeometry {
  qv: number;
  e: number;
  slabTop: number;
  slabHeight: number;
  innerOpacity: number;
  pointerInteractive: boolean;
  chevronRotateDeg: number;
  islandVisible: boolean;
  islandLeft: number;
  islandTop: number;
  islandWidth: number;
  islandHeight: number;
  islandRadius: number;
  detailTop: number;
  detailHeight: number;
  detailOpacity: number;
  detailInteractive: boolean;
}

/**
 * Computes per-frame inline DOM styles for a row (matches Adherents.dc.html draw()).
 */
export function computeRowVisualGeometry(
  pX: number,
  eX: number,
  w: number,
  h: number,
  viewMode: 'list' | 'grid' | 'l' | 'g'
): RowVisualGeometry {
  const isList = viewMode === 'l' || viewMode === 'list';
  const p = pX / 100;
  const qv = clamp(p, 0, 1.05);
  const e = clamp(eX / 100, 0, 1.1);

  const slabTop = (h * (1 - qv)) / 2;
  const slabHeight = Math.max(0, h * qv);
  const innerOpacity = clamp((p - 0.5) / 0.4, 0, 1);
  const pointerInteractive = p > 0.6;
  const chevronRotateDeg = e * 180;

  const islandVisible = isList && e >= 0.01;
  const islandLeft = (w - 14 - ROW_B) * (1 - e);
  const islandTop = (ROW_H / 2 - ROW_B / 2) * (1 - e) + (ROW_H + ROW_G) * e;
  const islandWidth = Math.max(0, ROW_B + (w - ROW_B) * e);
  const islandHeight = Math.max(0, ROW_B + (ROW_DH - ROW_B) * e);
  const islandRadius = 19 + 3 * e;

  const detailTop = ROW_H + ROW_G;
  const detailHeight = ROW_DH;
  const detailOpacity = clamp((e - 0.55) / 0.35, 0, 1);
  const detailInteractive = isList && detailOpacity > 0.6;

  return {
    qv,
    e,
    slabTop,
    slabHeight,
    innerOpacity,
    pointerInteractive,
    chevronRotateDeg,
    islandVisible,
    islandLeft,
    islandTop,
    islandWidth,
    islandHeight,
    islandRadius,
    detailTop,
    detailHeight,
    detailOpacity,
    detailInteractive,
  };
}

export interface PanelVisualMetrics {
  pq: number;
  translateX: number;
  scrimOpacity: number;
  visible: boolean;
}

/**
 * Computes slide-in detail panel translateX, scrim opacity, and visibility from spring pp (tune 24).
 */
export function computePanelMetrics(ppX: number, ppTarget: number): PanelVisualMetrics {
  const pq = clamp(ppX / 100, 0, 1.08);
  return {
    pq,
    translateX: (1 - pq) * 620,
    scrimOpacity: clamp(pq, 0, 1),
    visible: !(ppX < 1 && ppTarget === 0),
  };
}

export const WINDOW_OVERSCAN_PX = 440;
export const WINDOW_HYSTERESIS_PX = 180;

export function doesRowOverlapWindow(
  y: number,
  h: number,
  isExpanded: boolean,
  minY: number,
  maxY: number
): boolean {
  const bottom = y + h + (isExpanded ? ROW_DH + ROW_G : 0);
  return bottom >= minY && y <= maxY;
}

export interface BulkBarMetrics {
  bp: number;
  visible: boolean;
  opacity: number;
  translateY: number;
  scale: number;
}

/**
 * Computes floating bulk action bar transform and visibility from spring bar (tune 26).
 */
export function computeBulkBarMetrics(barX: number, barTarget: number): BulkBarMetrics {
  const bp = clamp(barX / 100, 0, 1.15);
  return {
    bp,
    visible: !(barX < 1 && barTarget === 0),
    opacity: clamp(bp * 1.6, 0, 1),
    translateY: (1 - bp) * 46,
    scale: 0.9 + 0.1 * bp,
  };
}
