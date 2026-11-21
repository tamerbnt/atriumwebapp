import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  Sp,
  wake,
  subscribeFrame,
  subscribeCleanup,
} from './kineticMotion';
import {
  ROW_H,
  ROW_G,
  ROW_DH,
  ROW_B,
  CARD_H,
  TUNES,
  WINDOW_OVERSCAN_PX,
  WINDOW_HYSTERESIS_PX,
  RowTargetPlacement,
  computeRowTargets,
  computeRowVisualGeometry,
  doesRowOverlapWindow,
} from './kineticMath';

export { ROW_H, ROW_G, ROW_DH, ROW_B, CARD_H };

export interface KineticRowDomRefs {
  rowEl: HTMLDivElement | null;
  slabEl: HTMLDivElement | null;
  innEl: HTMLDivElement | null;
  detEl: HTMLDivElement | null;
  dcEl: HTMLDivElement | null;
  rbEl: HTMLButtonElement | null;
  dcButtons: HTMLButtonElement[];
}

export interface KineticRenderedRow<T = any> {
  id: string;
  item: T;
  isMatching: boolean;
}

interface AppliedCache {
  x: number;
  y: number;
  w: number;
  h: number;
  p: number;
  e: number;
  mode: 'list' | 'grid';
  moving: boolean;
}

interface ManagedRow<T> {
  id: string;
  item: T;
  p: Sp;
  e: Sp;
  sx: Sp;
  sy: Sp;
  sw: Sp;
  sh: Sp;
  targetW: number;
  targetH: number;
  innFixedW: number;
  innFixedH: number;
  innLayerActive: boolean;
  rowContainStrict: boolean;
  lastClipKey: string;
  fresh: boolean;
  isMatching: boolean;
  slabFull: boolean;
  willChangeActive: boolean;
  refs: KineticRowDomRefs;
  lastDcTabIndex: number | null;
  lastApplied: AppliedCache | null;
}

export interface UseKineticCollectionLayoutOptions<T> {
  items: readonly T[];
  keyExtractor: (item: T) => string;
  expandedIds: ReadonlySet<string>;
  viewMode: 'list' | 'grid';
  filterKey: string;
  rowsElRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  openItemId?: string | null;
  onPruneSelection?: (hiddenIds: string[]) => void;
  onFilterChange?: () => void;
}

const qHalf = (v: number): number => Math.round(v * 2) / 2;
const qTenth = (v: number): number => Math.round(v * 10) / 10;
const qHundredth = (v: number): number => Math.round(v * 100) / 100;
const qThousandth = (v: number): number => Math.round(v * 1000) / 1000;

function isRowAtRest<T>(r: ManagedRow<T>): boolean {
  return (
    r.p.rest() &&
    r.e.rest() &&
    r.sx.rest() &&
    r.sy.rest() &&
    r.sw.rest() &&
    r.sh.rest()
  );
}

function needsStyleApply<T>(r: ManagedRow<T>, viewMode: 'list' | 'grid'): boolean {
  const prev = r.lastApplied;
  if (!prev) return true;
  if (prev.mode !== viewMode) return true;
  if (!isRowAtRest(r) || prev.moving) return true;
  return (
    prev.x !== qHalf(r.sx.x) ||
    prev.y !== qHalf(r.sy.x) ||
    prev.w !== qHalf(Math.max(0, r.sw.x)) ||
    prev.h !== qHalf(Math.max(0, r.sh.x)) ||
    prev.p !== qTenth(r.p.x) ||
    prev.e !== qTenth(r.e.x)
  );
}

function applyRowStyles<T>(r: ManagedRow<T>, viewMode: 'list' | 'grid', isRtl: boolean): void {
  const { rowEl, slabEl, innEl, detEl, dcEl, rbEl } = r.refs;
  if (!rowEl) return;

  const rx = qHalf(r.sx.x);
  const ry = qHalf(r.sy.x);
  const rw = Math.round(Math.max(0, r.sw.x));
  const rh = Math.round(Math.max(0, r.sh.x));
  const tw = Math.round(Math.max(0, r.targetW));
  const th = Math.round(Math.max(0, r.targetH));
  const rp = qTenth(r.p.x);
  const re = qTenth(r.e.x);
  const isMoving = !isRowAtRest(r);
  const isSizeMorphing = isMoving && (rw !== tw || rh !== th);

  const prev = r.lastApplied;

  if (
    prev &&
    prev.x === rx &&
    prev.y === ry &&
    prev.w === rw &&
    prev.h === rh &&
    prev.p === rp &&
    prev.e === re &&
    prev.mode === viewMode &&
    prev.moving === isMoving &&
    !isSizeMorphing &&
    r.innFixedW === -1
  ) {
    return;
  }

  const posChanged = !prev || prev.x !== rx || prev.y !== ry || prev.w !== rw || prev.h !== rh;
  const visChanged =
    !prev ||
    prev.p !== rp ||
    prev.e !== re ||
    prev.w !== rw ||
    prev.h !== rh ||
    prev.mode !== viewMode;

  r.lastApplied = { x: rx, y: ry, w: rw, h: rh, p: rp, e: re, mode: viewMode, moving: isMoving };

  if (r.willChangeActive !== isMoving) {
    r.willChangeActive = isMoving;
    rowEl.style.willChange = isMoving ? 'transform' : '';
  }

  // Isolate Blink layout/paint inside row bounds while morphing between List and Grid widths/heights
  const wantStrictRow = isSizeMorphing && re < 0.01;
  if (r.rowContainStrict !== wantStrictRow) {
    r.rowContainStrict = wantStrictRow;
    rowEl.style.contain = wantStrictRow ? 'strict' : '';
  }

  const geom = computeRowVisualGeometry(rp, re, rw, rh, viewMode);

  if (posChanged || !prev || prev.p !== rp) {
    const st = rowEl.style;
    if (!prev || prev.x !== rx || prev.y !== ry) {
      st.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    }
    if (!prev || prev.w !== rw) st.width = `${rw}px`;
    if (!prev || prev.h !== rh) st.height = `${rh}px`;
    if (!prev || prev.p !== rp) st.pointerEvents = geom.pointerInteractive ? 'auto' : 'none';
  }

  if (innEl) {
    if (isSizeMorphing) {
      if (r.innFixedW !== tw) {
        r.innFixedW = tw;
        innEl.style.width = `${tw}px`;
      }
      if (r.innFixedH !== th) {
        r.innFixedH = th;
        innEl.style.height = `${th}px`;
      }
      if (!r.innLayerActive) {
        r.innLayerActive = true;
        innEl.style.contain = 'strict';
      }
      // Integer pixel clipPath prevents costly subpixel antialiasing passes on 25 rows simultaneously
      const clipX = Math.max(0, Math.round(tw - rw));
      const clipY = Math.max(0, Math.round(th - rh));
      const nextClip =
        clipX > 0 || clipY > 0
          ? isRtl
            ? `inset(0px 0px ${clipY}px ${clipX}px round 16px)`
            : `inset(0px ${clipX}px ${clipY}px 0px round 16px)`
          : '';
      if (r.lastClipKey !== nextClip) {
        r.lastClipKey = nextClip;
        innEl.style.clipPath = nextClip;
      }
    } else {
      if (r.innFixedW !== -1) {
        r.innFixedW = -1;
        innEl.style.width = '';
      }
      if (r.innFixedH !== -1) {
        r.innFixedH = -1;
        innEl.style.height = '';
      }
      if (r.lastClipKey !== '') {
        r.lastClipKey = '';
        innEl.style.clipPath = '';
      }
      if (r.innLayerActive) {
        r.innLayerActive = false;
        innEl.style.willChange = '';
        innEl.style.contain = '';
      }
    }
  }

  if (!visChanged) return;

  if (slabEl) {
    if (rp === 100) {
      if (!r.slabFull) {
        r.slabFull = true;
        slabEl.style.transform = '';
      }
    } else if (!prev || prev.p !== rp || r.slabFull) {
      r.slabFull = false;
      slabEl.style.transform = `translate3d(0, 0, 0) scaleY(${qThousandth(geom.qv)})`;
    }
  }

  if (innEl && (!prev || prev.p !== rp)) {
    innEl.style.opacity = String(qHundredth(geom.innerOpacity));
  }

  if (rbEl && (!prev || prev.e !== re || prev.p !== rp)) {
    rbEl.style.rotate = `${qTenth(geom.chevronRotateDeg)}deg`;
    rbEl.style.opacity = String(qHundredth(geom.innerOpacity));
  }

  if (detEl && (geom.islandVisible || !prev || prev.e !== re || prev.mode !== viewMode)) {
    const d = detEl.style;
    if (!geom.islandVisible) {
      if (d.display !== 'none') d.display = 'none';
    } else {
      if (d.display !== 'block') d.display = 'block';
      d.transform = `translate3d(${qHalf(geom.islandLeft)}px, ${qHalf(geom.islandTop)}px, 0)`;
      const nw = `${qHalf(geom.islandWidth)}px`;
      if (d.width !== nw) d.width = nw;
      const nh = `${qHalf(geom.islandHeight)}px`;
      if (d.height !== nh) d.height = nh;
      const nr = `${qTenth(geom.islandRadius)}px`;
      if (d.borderRadius !== nr) d.borderRadius = nr;
    }
  }

  if (dcEl && (!prev || prev.e !== re || prev.mode !== viewMode)) {
    const dc = dcEl.style;
    if (!geom.islandVisible) {
      if (dc.display !== 'none') {
        dc.display = 'none';
        dc.pointerEvents = 'none';
      }
    } else {
      if (dc.display !== 'grid') dc.display = 'grid';
      dc.opacity = String(qHundredth(geom.detailOpacity));
      dc.pointerEvents = geom.detailInteractive ? 'auto' : 'none';
    }

    const nextTabIdx = geom.detailInteractive ? 0 : -1;
    if (r.lastDcTabIndex !== nextTabIdx) {
      r.lastDcTabIndex = nextTabIdx;
      dcEl.setAttribute('aria-hidden', nextTabIdx === 0 ? 'false' : 'true');
      const buttons =
        r.refs.dcButtons.length > 0
          ? r.refs.dcButtons
          : (Array.from(dcEl.querySelectorAll('button')) as HTMLButtonElement[]);
      if (buttons.length > 0) {
        r.refs.dcButtons = buttons;
        for (let i = 0; i < buttons.length; i++) {
          buttons[i].tabIndex = nextTabIdx;
        }
      }
    }
  }
}

export function findWindowRange<T>(
  itemsList: readonly T[],
  keyExtractor: (item: T) => string,
  targets: ReadonlyMap<string, RowTargetPlacement>,
  mode: 'list' | 'grid',
  minY: number,
  maxY: number
): [number, number] {
  const len = itemsList.length;
  if (len === 0) return [0, 0];
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) return [0, len];

  if (mode === 'grid') {
    const pitch = CARD_H + ROW_G;
    const startRow = Math.max(0, Math.floor(minY / pitch));
    const endRow = Math.max(0, Math.floor(maxY / pitch) + 1);
    return [Math.min(len, startRow * 3), Math.min(len, endRow * 3)];
  }

  let lo = 0;
  let hi = len;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const tgt = targets.get(keyExtractor(itemsList[mid]));
    if (!tgt) {
      lo = mid + 1;
      continue;
    }
    const bottom = tgt.y + tgt.h + (tgt.eTarget > 0 ? ROW_DH + ROW_G : 0);
    if (bottom < minY) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  const startIdx = lo;

  let endIdx = startIdx;
  while (endIdx < len) {
    const tgt = targets.get(keyExtractor(itemsList[endIdx]));
    if (tgt && tgt.y > maxY) break;
    endIdx++;
  }

  return [startIdx, endIdx];
}

export function useKineticCollectionLayout<T>({
  items,
  keyExtractor,
  expandedIds,
  viewMode,
  filterKey,
  rowsElRef,
  scrollContainerRef,
  openItemId,
  onPruneSelection,
  onFilterChange,
}: UseKineticCollectionLayoutOptions<T>) {
  const managedMapRef = useRef<Map<string, ManagedRow<T>>>(new Map());
  const movingRowsRef = useRef<Set<ManagedRow<T>>>(new Set());
  const orderedIdsRef = useRef<string[]>([]);
  const renderedRowsRef = useRef<KineticRenderedRow<T>[]>([]);
  const [renderedRows, setRenderedRows] = useState<KineticRenderedRow<T>[]>([]);

  const keyExtractorRef = useRef(keyExtractor);
  keyExtractorRef.current = keyExtractor;

  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const openItemIdRef = useRef(openItemId ?? null);
  openItemIdRef.current = openItemId ?? null;

  const focusedIdRef = useRef<string | null>(null);
  const containerWidthRef = useRef<number>(1200);
  const scrollTopRef = useRef<number>(0);
  const viewportHRef = useRef<number>(640);
  const isInitialPaintRef = useRef<boolean>(true);
  const prevFilterKeyRef = useRef<string>(filterKey);
  const prevViewModeRef = useRef<string>(viewMode);

  const onPruneRef = useRef(onPruneSelection);
  onPruneRef.current = onPruneSelection;

  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const itemsByIdRef = useRef<Map<string, T>>(new Map());
  const expandedRef = useRef(expandedIds);
  expandedRef.current = expandedIds;

  const prevTargetsRef = useRef<Map<string, RowTargetPlacement>>(new Map());
  const latestTargetsRef = useRef<Map<string, RowTargetPlacement>>(new Map());
  const prevMatchingIdsRef = useRef<Set<string>>(new Set());
  const exitingCountRef = useRef<number>(0);
  const needsCleanupScanRef = useRef<boolean>(false);
  const lastScrollWindowKeyRef = useRef<string>('');
  const mountedWindowRef = useRef<{ minY: number; maxY: number; metaKey: string } | null>(null);
  const drawRemoveScratchRef = useRef<ManagedRow<T>[]>([]);
  const isRtlRef = useRef<boolean>(false);

  const getWindowBounds = useCallback(
    (hysteresis = 0): { minY: number; maxY: number; hasScroller: boolean } => {
      const scr = scrollContainerRef?.current;
      if (!scr) {
        return { minY: -Infinity, maxY: Infinity, hasScroller: false };
      }
      const scrollTop = scrollTopRef.current;
      const viewportH = viewportHRef.current;
      return {
        minY: scrollTop - WINDOW_OVERSCAN_PX - hysteresis,
        maxY: scrollTop + viewportH + WINDOW_OVERSCAN_PX + hysteresis,
        hasScroller: true,
      };
    },
    [scrollContainerRef]
  );

  const drawAll = useCallback(() => {
    const moving = movingRowsRef.current;
    if (moving.size === 0) return;
    const mode = viewModeRef.current;
    const isRtl = isRtlRef.current;
    const toRemove = drawRemoveScratchRef.current;
    toRemove.length = 0;

    moving.forEach((r) => {
      applyRowStyles(r, mode, isRtl);
      if (isRowAtRest(r) && r.lastApplied && !r.lastApplied.moving && r.lastApplied.mode === mode) {
        toRemove.push(r);
      }
    });

    for (let i = 0; i < toRemove.length; i++) {
      moving.delete(toRemove[i]);
    }
    toRemove.length = 0;
  }, []);

  const commitRenderedRows = useCallback((nextOrderedIds: string[]) => {
    const map = managedMapRef.current;
    const prev = renderedRowsRef.current;
    const nextRows: KineticRenderedRow<T>[] = [];

    for (let i = 0; i < nextOrderedIds.length; i++) {
      const r = map.get(nextOrderedIds[i]);
      if (r) {
        nextRows.push({ id: r.id, item: r.item, isMatching: r.isMatching });
      }
    }

    if (prev.length === nextRows.length) {
      let same = true;
      for (let i = 0; i < prev.length; i++) {
        if (
          prev[i].id !== nextRows[i].id ||
          prev[i].item !== nextRows[i].item ||
          prev[i].isMatching !== nextRows[i].isMatching
        ) {
          same = false;
          break;
        }
      }
      if (same) return;
    }

    orderedIdsRef.current = nextRows.map((row) => row.id);
    renderedRowsRef.current = nextRows;
    setRenderedRows(nextRows);
  }, []);

  const cleanupAll = useCallback(() => {
    if (!needsCleanupScanRef.current && exitingCountRef.current === 0) return;

    const map = managedMapRef.current;
    const targets = latestTargetsRef.current;
    const expanded = expandedRef.current;
    const openId = openItemIdRef.current;
    const focusedId = focusedIdRef.current;
    const { minY, maxY, hasScroller } = getWindowBounds(WINDOW_HYSTERESIS_PX);

    const toDelete: string[] = [];
    let stillMovingOrExiting = false;

    map.forEach((r, id) => {
      if (!r.isMatching) {
        if (r.p.t === 0 && r.p.rest() && r.e.rest()) {
          toDelete.push(id);
        } else {
          stillMovingOrExiting = true;
        }
        return;
      }

      const settled = isRowAtRest(r);
      if (!settled) {
        stillMovingOrExiting = true;
        return;
      }

      if (hasScroller && id !== openId && id !== focusedId && !expanded.has(id)) {
        const tgt = targets.get(id);
        if (!tgt || !doesRowOverlapWindow(tgt.y, tgt.h, tgt.eTarget > 0, minY, maxY)) {
          toDelete.push(id);
        }
      }
    });

    if (!stillMovingOrExiting) {
      needsCleanupScanRef.current = false;
      exitingCountRef.current = 0;
    }

    if (toDelete.length === 0) return;

    let remainingExiting = 0;
    for (let i = 0; i < toDelete.length; i++) {
      const id = toDelete[i];
      const r = map.get(id);
      if (r) {
        movingRowsRef.current.delete(r);
        r.p.destroy();
        r.e.destroy();
        r.sx.destroy();
        r.sy.destroy();
        r.sw.destroy();
        r.sh.destroy();
        map.delete(id);
      }
    }
    map.forEach((r) => {
      if (!r.isMatching) remainingExiting++;
    });
    exitingCountRef.current = remainingExiting;

    commitRenderedRows(orderedIdsRef.current.filter((id) => map.has(id)));
  }, [commitRenderedRows, getWindowBounds]);

  const registerRowRefs = useCallback((id: string, refs: KineticRowDomRefs | null) => {
    const r = managedMapRef.current.get(id);
    if (!r) return;
    if (refs) {
      r.refs = refs;
      r.slabFull = false;
      r.willChangeActive = false;
      r.rowContainStrict = false;
      r.innFixedW = -1;
      r.innFixedH = -1;
      r.innLayerActive = false;
      r.lastClipKey = '';
      r.lastDcTabIndex = null;
      r.lastApplied = null;
      applyRowStyles(r, viewModeRef.current, isRtlRef.current);
      if (!isRowAtRest(r)) {
        movingRowsRef.current.add(r);
      }
    } else {
      r.refs = {
        rowEl: null,
        slabEl: null,
        innEl: null,
        detEl: null,
        dcEl: null,
        rbEl: null,
        dcButtons: [],
      };
      r.slabFull = false;
      r.willChangeActive = false;
      r.rowContainStrict = false;
      r.innFixedW = -1;
      r.innFixedH = -1;
      r.innLayerActive = false;
      r.lastClipKey = '';
      r.lastApplied = null;
      movingRowsRef.current.delete(r);
    }
  }, []);

  const syncWindowOnScroll = useCallback(() => {
    const map = managedMapRef.current;
    const itemsList = itemsRef.current;
    const getId = keyExtractorRef.current;
    const targets = latestTargetsRef.current;
    const expanded = expandedRef.current;
    const mode = viewModeRef.current;
    const openId = openItemIdRef.current;
    const focusedId = focusedIdRef.current;
    const { minY, maxY, hasScroller } = getWindowBounds(0);
    if (!hasScroller) return;

    const metaKey = `${itemsList.length}:${mode}:${openId ?? ''}:${focusedId ?? ''}:${expanded.size}`;
    const visMinY = scrollTopRef.current;
    const visMaxY = visMinY + viewportHRef.current;
    const prevWin = mountedWindowRef.current;
    if (
      prevWin &&
      prevWin.metaKey === metaKey &&
      visMinY - 140 >= prevWin.minY &&
      visMaxY + 140 <= prevWin.maxY &&
      movingRowsRef.current.size === 0 &&
      exitingCountRef.current === 0
    ) {
      return;
    }

    const [startIdx, endIdx] = findWindowRange(itemsList, getId, targets, mode, minY, maxY);
    const windowKey = `${startIdx}:${endIdx}:${metaKey}`;
    if (
      windowKey === lastScrollWindowKeyRef.current &&
      movingRowsRef.current.size === 0 &&
      exitingCountRef.current === 0
    ) {
      mountedWindowRef.current = { minY, maxY, metaKey };
      return;
    }
    lastScrollWindowKeyRef.current = windowKey;
    mountedWindowRef.current = { minY, maxY, metaKey };

    const keepBounds = getWindowBounds(WINDOW_HYSTERESIS_PX);
    const [keepStartIdx, keepEndIdx] = findWindowRange(
      itemsList,
      getId,
      targets,
      mode,
      keepBounds.minY,
      keepBounds.maxY
    );

    const wantedSet = new Set<string>();
    const nextOrderedIds: string[] = [];

    const loopStart = Math.min(keepStartIdx, startIdx);
    const loopEnd = Math.max(keepEndIdx, endIdx);
    for (let i = loopStart; i < loopEnd; i++) {
      const id = getId(itemsList[i]);
      if ((i >= startIdx && i < endIdx) || map.has(id)) {
        wantedSet.add(id);
        nextOrderedIds.push(id);
      }
    }

    const specialIds = [openId, focusedId];
    for (let i = 0; i < specialIds.length; i++) {
      const sid = specialIds[i];
      if (sid && !wantedSet.has(sid) && targets.has(sid)) {
        wantedSet.add(sid);
        nextOrderedIds.push(sid);
      }
    }
    expanded.forEach((eid) => {
      if (!wantedSet.has(eid) && targets.has(eid)) {
        wantedSet.add(eid);
        nextOrderedIds.push(eid);
      }
    });

    let changed = false;
    const itemsById = itemsByIdRef.current;

    for (let i = 0; i < nextOrderedIds.length; i++) {
      const id = nextOrderedIds[i];
      const tgt = targets.get(id);
      const item = itemsById.get(id);
      if (!tgt || !item) continue;

      const existing = map.get(id);
      if (!existing) {
        const r: ManagedRow<T> = {
          id,
          item,
          p: new Sp(100, TUNES.rowPresence),
          e: new Sp(tgt.eTarget, TUNES.rowExpand),
          sx: new Sp(tgt.x, TUNES.rowPosition),
          sy: new Sp(tgt.y, TUNES.rowPosition),
          sw: new Sp(tgt.w, TUNES.rowPosition),
          sh: new Sp(tgt.h, TUNES.rowPosition),
          targetW: tgt.w,
          targetH: tgt.h,
          innFixedW: -1,
          innFixedH: -1,
          innLayerActive: false,
          rowContainStrict: false,
          lastClipKey: '',
          fresh: false,
          isMatching: true,
          slabFull: false,
          willChangeActive: false,
          refs: {
            rowEl: null,
            slabEl: null,
            innEl: null,
            detEl: null,
            dcEl: null,
            rbEl: null,
            dcButtons: [],
          },
          lastDcTabIndex: null,
          lastApplied: null,
        };
        map.set(id, r);
        if (!isRowAtRest(r)) {
          movingRowsRef.current.add(r);
        }
        changed = true;
      } else {
        existing.item = item;
        existing.targetW = tgt.w;
        existing.targetH = tgt.h;
      }
    }

    const toDelete: string[] = [];
    map.forEach((r, id) => {
      if (!r.isMatching) {
        nextOrderedIds.push(id);
        return;
      }
      if (wantedSet.has(id)) return;

      const tgt = targets.get(id);
      const inKeep = tgt
        ? doesRowOverlapWindow(tgt.y, tgt.h, tgt.eTarget > 0, keepBounds.minY, keepBounds.maxY)
        : false;
      const settled = isRowAtRest(r);

      if (!inKeep && settled) {
        toDelete.push(id);
      } else {
        nextOrderedIds.push(id);
      }
    });

    for (let i = 0; i < toDelete.length; i++) {
      const id = toDelete[i];
      const r = map.get(id);
      if (r) {
        movingRowsRef.current.delete(r);
        r.p.destroy();
        r.e.destroy();
        r.sx.destroy();
        r.sy.destroy();
        r.sw.destroy();
        r.sh.destroy();
        map.delete(id);
        changed = true;
      }
    }

    if (changed) {
      commitRenderedRows(nextOrderedIds);
    }
  }, [commitRenderedRows, getWindowBounds]);

  const place = useCallback(
    (snapWidthChange = false) => {
      const map = managedMapRef.current;
      const itemsList = itemsRef.current;
      const getId = keyExtractorRef.current;
      const expanded = expandedRef.current;
      const mode = viewModeRef.current;
      const openId = openItemIdRef.current;
      const focusedId = focusedIdRef.current;
      lastScrollWindowKeyRef.current = '';
      mountedWindowRef.current = null;

      if (rowsElRef.current && rowsElRef.current.clientWidth > 0) {
        containerWidthRef.current = rowsElRef.current.clientWidth;
      }
      if (typeof document !== 'undefined') {
        isRtlRef.current = document.documentElement.dir === 'rtl';
      }

      const W = containerWidthRef.current || 1200;
      const matchingIds = new Array<string>(itemsList.length);
      const byId = new Map<string, T>();
      for (let i = 0; i < itemsList.length; i++) {
        const item = itemsList[i];
        const id = getId(item);
        matchingIds[i] = id;
        byId.set(id, item);
      }
      itemsByIdRef.current = byId;
      const matchingSet = new Set(matchingIds);

      const { targets, totalHeight } = computeRowTargets(matchingIds, expanded, W, mode);

      if (rowsElRef.current) {
        rowsElRef.current.dataset.v = mode === 'grid' ? 'g' : 'l';
        rowsElRef.current.style.height = `${Math.max(0, totalHeight)}px`;
        rowsElRef.current.style.contain = 'layout style size';
      }

      if (scrollContainerRef?.current) {
        scrollTopRef.current = scrollContainerRef.current.scrollTop || 0;
      }

      const initialLoad = isInitialPaintRef.current;
      isInitialPaintRef.current = false;

      const prevMatch = prevMatchingIdsRef.current;
      const newlyHiddenIds: string[] = [];
      prevMatch.forEach((prevId) => {
        if (!matchingSet.has(prevId)) {
          newlyHiddenIds.push(prevId);
        }
      });

      const { minY, maxY, hasScroller } = getWindowBounds(0);
      const keepBounds = getWindowBounds(WINDOW_HYSTERESIS_PX);
      const prevTargets = prevTargetsRef.current;
      const nextOrderedIds: string[] = [];
      let exitingCount = 0;

      for (let i = 0; i < itemsList.length; i++) {
        const item = itemsList[i];
        const id = matchingIds[i];
        const tgt = targets.get(id)!;
        let r = map.get(id);

        const isNewMatch = !initialLoad && !prevMatch.has(id);
        const isSpecial = id === openId || id === focusedId || expanded.has(id);
        const targetInWin =
          !hasScroller ||
          isSpecial ||
          doesRowOverlapWindow(tgt.y, tgt.h, tgt.eTarget > 0, minY, maxY);

        const currentInWin = r
          ? !hasScroller ||
            doesRowOverlapWindow(r.sy.x, r.sh.x, r.e.x > 0.01, keepBounds.minY, keepBounds.maxY)
          : false;

        const prevTgt = prevTargets.get(id);
        const prevInWin = prevTgt
          ? !hasScroller ||
            doesRowOverlapWindow(prevTgt.y, prevTgt.h, prevTgt.eTarget > 0, minY, maxY)
          : false;

        if (!r && (targetInWin || prevInWin)) {
          const startPos = !isNewMatch && prevTgt ? prevTgt : tgt;
          const startP = isNewMatch ? 0 : 100;
          const startE = initialLoad ? tgt.eTarget : prevTgt ? prevTgt.eTarget : tgt.eTarget;

          r = {
            id,
            item,
            p: new Sp(startP, TUNES.rowPresence),
            e: new Sp(startE, TUNES.rowExpand),
            sx: new Sp(startPos.x, TUNES.rowPosition),
            sy: new Sp(startPos.y, TUNES.rowPosition),
            sw: new Sp(startPos.w, TUNES.rowPosition),
            sh: new Sp(startPos.h, TUNES.rowPosition),
            targetW: tgt.w,
            targetH: tgt.h,
            innFixedW: -1,
            innFixedH: -1,
            innLayerActive: false,
            rowContainStrict: false,
            lastClipKey: '',
            fresh: Boolean(isNewMatch || initialLoad),
            isMatching: true,
            slabFull: false,
            willChangeActive: false,
            refs: {
              rowEl: null,
              slabEl: null,
              innEl: null,
              detEl: null,
              dcEl: null,
              rbEl: null,
              dcButtons: [],
            },
            lastDcTabIndex: null,
            lastApplied: null,
          };
          map.set(id, r);
        }

        if (r) {
          if (!targetInWin && !currentInWin && !isSpecial) {
            movingRowsRef.current.delete(r);
            r.p.destroy();
            r.e.destroy();
            r.sx.destroy();
            r.sy.destroy();
            r.sw.destroy();
            r.sh.destroy();
            map.delete(id);
            continue;
          }

          r.item = item;
          r.isMatching = true;
          r.targetW = tgt.w;
          r.targetH = tgt.h;
          r.p.setTarget(100);
          r.e.setTarget(tgt.eTarget);
          r.sx.setTarget(tgt.x);
          r.sy.setTarget(tgt.y);
          r.sw.setTarget(tgt.w);
          r.sh.setTarget(tgt.h);

          if (r.fresh) {
            r.sx.snap();
            r.sy.snap();
            r.sw.snap();
            r.sh.snap();
            r.fresh = false;
          } else if (snapWidthChange) {
            r.sw.snap();
            r.sh.snap();
          }

          if (needsStyleApply(r, mode)) {
            movingRowsRef.current.add(r);
          }

          nextOrderedIds.push(id);
        }
      }

      map.forEach((r, id) => {
        if (!matchingSet.has(id)) {
          const inWin =
            !hasScroller ||
            doesRowOverlapWindow(r.sy.x, r.sh.x, r.e.x > 0.01, keepBounds.minY, keepBounds.maxY);
          if (!inWin) {
            movingRowsRef.current.delete(r);
            r.p.destroy();
            r.e.destroy();
            r.sx.destroy();
            r.sy.destroy();
            r.sw.destroy();
            r.sh.destroy();
            map.delete(id);
            return;
          }
          r.isMatching = false;
          r.p.setTarget(0);
          r.e.setTarget(0);
          movingRowsRef.current.add(r);
          exitingCount++;
          nextOrderedIds.push(id);
        }
      });

      exitingCountRef.current = exitingCount;
      needsCleanupScanRef.current = exitingCount > 0 || movingRowsRef.current.size > 0;

      prevTargetsRef.current = latestTargetsRef.current;
      latestTargetsRef.current = targets;
      prevMatchingIdsRef.current = matchingSet;

      commitRenderedRows(nextOrderedIds);

      if (newlyHiddenIds.length > 0) {
        onPruneRef.current?.(newlyHiddenIds);
      }

      drawAll();
      wake();
    },
    [commitRenderedRows, drawAll, getWindowBounds, rowsElRef, scrollContainerRef]
  );

  useEffect(() => {
    const unsubDraw = subscribeFrame(drawAll);
    const unsubClean = subscribeCleanup(cleanupAll);
    return () => {
      unsubDraw();
      unsubClean();
    };
  }, [drawAll, cleanupAll]);

  useEffect(() => {
    const el = rowsElRef.current;
    if (!el) return;
    const onFocusIn = (e: FocusEvent) => {
      const row = (e.target as HTMLElement | null)?.closest?.('.row') as HTMLElement | null;
      focusedIdRef.current = row?.dataset?.id ?? null;
    };
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as HTMLElement | null;
      if (!next || !el.contains(next)) {
        focusedIdRef.current = null;
      }
    };
    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);
    return () => {
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
    };
  }, [rowsElRef]);

  useEffect(() => {
    const scr = scrollContainerRef?.current;
    if (!scr) return;
    scrollTopRef.current = scr.scrollTop || 0;
    viewportHRef.current = Math.max(480, scr.clientHeight || 640);

    let scrollRaf = 0;
    const onScroll = () => {
      scrollTopRef.current = scr.scrollTop || 0;
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        syncWindowOnScroll();
      });
    };
    scr.addEventListener('scroll', onScroll, { passive: true });

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const nextH = Math.max(480, Math.round(entry.contentRect.height) || 640);
          if (nextH !== viewportHRef.current) {
            const delta = Math.abs(nextH - viewportHRef.current);
            viewportHRef.current = nextH;
            if (movingRowsRef.current.size === 0 || delta > 80) {
              syncWindowOnScroll();
            }
          }
        }
      });
      ro.observe(scr);
    }

    return () => {
      scr.removeEventListener('scroll', onScroll);
      ro?.disconnect();
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
    };
  }, [scrollContainerRef, syncWindowOnScroll]);

  useEffect(() => {
    const el = rowsElRef.current;
    if (!el) return;

    if (el.clientWidth > 0) {
      containerWidthRef.current = el.clientWidth;
    }

    if (typeof ResizeObserver === 'undefined') return;
    let prevW = containerWidthRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(el.clientWidth || entry.contentRect.width);
        if (w > 0 && w !== prevW) {
          prevW = w;
          containerWidthRef.current = w;
          place(true);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [rowsElRef, place]);

  useLayoutEffect(() => {
    const filterChanged = prevFilterKeyRef.current !== filterKey;
    prevFilterKeyRef.current = filterKey;
    const modeChanged = prevViewModeRef.current !== viewMode;
    prevViewModeRef.current = viewMode;

    if (filterChanged) {
      onFilterChangeRef.current?.();
    }

    place(modeChanged);
  }, [items, expandedIds, viewMode, filterKey, place]);

  useEffect(() => {
    return () => {
      movingRowsRef.current.clear();
      managedMapRef.current.forEach((r) => {
        r.p.destroy();
        r.e.destroy();
        r.sx.destroy();
        r.sy.destroy();
        r.sw.destroy();
        r.sh.destroy();
      });
      managedMapRef.current.clear();
      itemsByIdRef.current.clear();
      prevTargetsRef.current.clear();
      latestTargetsRef.current.clear();
      renderedRowsRef.current = [];
    };
  }, []);

  return {
    renderedRows,
    registerRowRefs,
    hasVisibleRows: items.length > 0,
  };
}
