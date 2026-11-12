import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sp,
  wake,
  subscribeFrame,
  subscribeCleanup,
} from './adherentsMotion';
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
} from './adherentsMath';
import { Member } from '../../../../types/index';

export { ROW_H, ROW_G, ROW_DH, ROW_B, CARD_H };

export interface RowDomRefs {
  rowEl: HTMLDivElement | null;
  slabEl: HTMLDivElement | null;
  innEl: HTMLDivElement | null;
  detEl: HTMLDivElement | null;
  dcEl: HTMLDivElement | null;
  rbEl: HTMLButtonElement | null;
  dcButtons: HTMLButtonElement[];
}

export interface KineticRenderedRow {
  id: string;
  member: Member;
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
}

interface ManagedRow {
  id: string;
  member: Member;
  p: Sp;
  e: Sp;
  sx: Sp;
  sy: Sp;
  sw: Sp;
  sh: Sp;
  fresh: boolean;
  isMatching: boolean;
  refs: RowDomRefs;
  lastDcTabIndex: number | null;
  lastApplied: AppliedCache | null;
}

export interface UseKineticRowLayoutOptions {
  matchingMembers: Member[];
  expandedMemberIds: Set<string>;
  viewMode: 'list' | 'grid';
  filterKey: string;
  rowsElRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  openMemberId?: string | null;
  onPruneSelection?: (hiddenIds: string[]) => void;
  onFilterChange?: () => void;
}

function applyRowStyles(r: ManagedRow, viewMode: 'list' | 'grid'): void {
  const { rowEl, slabEl, innEl, detEl, dcEl, rbEl, dcButtons } = r.refs;
  if (!rowEl) return;

  const rx = r.sx.x;
  const ry = r.sy.x;
  const rw = r.sw.x;
  const rh = r.sh.x;
  const rp = r.p.x;
  const re = r.e.x;
  const prev = r.lastApplied;

  if (
    prev &&
    prev.x === rx &&
    prev.y === ry &&
    prev.w === rw &&
    prev.h === rh &&
    prev.p === rp &&
    prev.e === re &&
    prev.mode === viewMode
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

  r.lastApplied = { x: rx, y: ry, w: rw, h: rh, p: rp, e: re, mode: viewMode };

  const w = Math.max(0, rw);
  const h = Math.max(0, rh);
  const geom = computeRowVisualGeometry(rp, re, w, h, viewMode);

  if (posChanged || !prev || prev.p !== rp) {
    const st = rowEl.style;
    if (!prev || prev.x !== rx || prev.y !== ry) {
      st.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    }
    if (!prev || prev.w !== rw) st.width = `${w}px`;
    if (!prev || prev.h !== rh) st.height = `${h}px`;
    if (!prev || prev.p !== rp) st.pointerEvents = geom.pointerInteractive ? 'auto' : 'none';
  }

  if (!visChanged) return;

  if (slabEl && (!prev || prev.p !== rp || prev.h !== rh)) {
    slabEl.style.top = `${geom.slabTop}px`;
    slabEl.style.height = `${geom.slabHeight}px`;
  }

  if (innEl && (!prev || prev.p !== rp)) {
    innEl.style.opacity = String(geom.innerOpacity);
  }

  if (rbEl && (!prev || prev.e !== re || prev.p !== rp)) {
    rbEl.style.rotate = `${geom.chevronRotateDeg}deg`;
    rbEl.style.opacity = String(geom.innerOpacity);
  }

  if (detEl && (!prev || prev.e !== re || prev.w !== rw || prev.mode !== viewMode || geom.islandVisible)) {
    const d = detEl.style;
    if (!geom.islandVisible) {
      if (d.display !== 'none') d.display = 'none';
    } else {
      d.display = 'block';
      d.left = `${geom.islandLeft}px`;
      d.top = `${geom.islandTop}px`;
      d.width = `${geom.islandWidth}px`;
      d.height = `${geom.islandHeight}px`;
      d.borderRadius = `${geom.islandRadius}px`;
    }
  }

  if (dcEl && (!prev || prev.e !== re || prev.mode !== viewMode || geom.islandVisible)) {
    const dc = dcEl.style;
    if (!geom.islandVisible) {
      if (dc.display !== 'none') {
        dc.display = 'none';
        dc.pointerEvents = 'none';
      }
    } else {
      dc.display = 'grid';
      dc.top = `${geom.detailTop}px`;
      dc.height = `${geom.detailHeight}px`;
      dc.opacity = String(geom.detailOpacity);
      dc.pointerEvents = geom.detailInteractive ? 'auto' : 'none';
    }

    const nextTabIdx = geom.detailInteractive ? 0 : -1;
    if (r.lastDcTabIndex !== nextTabIdx) {
      r.lastDcTabIndex = nextTabIdx;
      dcEl.setAttribute('aria-hidden', nextTabIdx === 0 ? 'false' : 'true');
      for (let i = 0; i < dcButtons.length; i++) {
        dcButtons[i].tabIndex = nextTabIdx;
      }
    }
  }
}

export function useKineticRowLayout({
  matchingMembers,
  expandedMemberIds,
  viewMode,
  filterKey,
  rowsElRef,
  scrollContainerRef,
  openMemberId,
  onPruneSelection,
  onFilterChange,
}: UseKineticRowLayoutOptions) {
  const managedMapRef = useRef<Map<string, ManagedRow>>(new Map());
  const orderedIdsRef = useRef<string[]>([]);
  const renderedRowsRef = useRef<KineticRenderedRow[]>([]);
  const [renderedRows, setRenderedRows] = useState<KineticRenderedRow[]>([]);

  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const openMemberIdRef = useRef(openMemberId ?? null);
  openMemberIdRef.current = openMemberId ?? null;

  const focusedIdRef = useRef<string | null>(null);
  const containerWidthRef = useRef<number>(1200);
  const isInitialPaintRef = useRef<boolean>(true);
  const prevFilterKeyRef = useRef<string>(filterKey);

  const onPruneRef = useRef(onPruneSelection);
  onPruneRef.current = onPruneSelection;

  const onFilterChangeRef = useRef(onFilterChange);
  onFilterChangeRef.current = onFilterChange;

  const matchingRef = useRef(matchingMembers);
  matchingRef.current = matchingMembers;

  const expandedRef = useRef(expandedMemberIds);
  expandedRef.current = expandedMemberIds;

  // Persistent O(N) snapshots so off-screen rows never need 6 Sp springs until entering the viewport
  const prevTargetsRef = useRef<Map<string, RowTargetPlacement>>(new Map());
  const latestTargetsRef = useRef<Map<string, RowTargetPlacement>>(new Map());
  const prevMatchingIdsRef = useRef<Set<string>>(new Set());

  const getWindowBounds = useCallback(
    (hysteresis = 0): { minY: number; maxY: number; hasScroller: boolean } => {
      const scr = scrollContainerRef?.current;
      if (!scr) {
        return { minY: -Infinity, maxY: Infinity, hasScroller: false };
      }
      const scrollTop = scr.scrollTop || 0;
      const viewportH = Math.max(480, scr.clientHeight || 640);
      return {
        minY: scrollTop - WINDOW_OVERSCAN_PX - hysteresis,
        maxY: scrollTop + viewportH + WINDOW_OVERSCAN_PX + hysteresis,
        hasScroller: true,
      };
    },
    [scrollContainerRef]
  );

  // Draw callback invoked once per shared rAF tick — writes styles directly to visible DOM refs
  const drawAll = useCallback(() => {
    const mode = viewModeRef.current;
    managedMapRef.current.forEach((r) => {
      const prev = r.lastApplied;
      if (
        prev &&
        prev.mode === mode &&
        r.p.rest() &&
        r.e.rest() &&
        r.sx.rest() &&
        r.sy.rest() &&
        r.sw.rest() &&
        r.sh.rest() &&
        prev.x === r.sx.x &&
        prev.y === r.sy.x &&
        prev.w === r.sw.x &&
        prev.h === r.sh.x &&
        prev.p === r.p.x &&
        prev.e === r.e.x
      ) {
        return;
      }
      applyRowStyles(r, mode);
    });
  }, []);

  const commitRenderedRows = useCallback((nextOrderedIds: string[]) => {
    const map = managedMapRef.current;
    const prev = renderedRowsRef.current;
    const nextRows: KineticRenderedRow[] = [];

    for (let i = 0; i < nextOrderedIds.length; i++) {
      const r = map.get(nextOrderedIds[i]);
      if (r) {
        nextRows.push({ id: r.id, member: r.member, isMatching: r.isMatching });
      }
    }

    if (prev.length === nextRows.length) {
      let same = true;
      for (let i = 0; i < prev.length; i++) {
        if (
          prev[i].id !== nextRows[i].id ||
          prev[i].member !== nextRows[i].member ||
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

  // Cleanup callback invoked at end of rAF tick — prunes collapsed exiting rows and settled off-screen rows
  const cleanupAll = useCallback(() => {
    const map = managedMapRef.current;
    const targets = latestTargetsRef.current;
    const expanded = expandedRef.current;
    const openId = openMemberIdRef.current;
    const focusedId = focusedIdRef.current;
    const { minY, maxY, hasScroller } = getWindowBounds(WINDOW_HYSTERESIS_PX);

    const toDelete: string[] = [];

    map.forEach((r, id) => {
      if (!r.isMatching && r.p.t === 0 && r.p.rest() && r.e.rest()) {
        toDelete.push(id);
        return;
      }

      if (
        hasScroller &&
        r.isMatching &&
        id !== openId &&
        id !== focusedId &&
        !expanded.has(id) &&
        r.p.rest() &&
        r.e.rest() &&
        r.sx.rest() &&
        r.sy.rest() &&
        r.sw.rest() &&
        r.sh.rest()
      ) {
        const tgt = targets.get(id);
        if (!tgt || !doesRowOverlapWindow(tgt.y, tgt.h, tgt.eTarget > 0, minY, maxY)) {
          toDelete.push(id);
        }
      }
    });

    if (toDelete.length === 0) return;

    toDelete.forEach((id) => {
      const r = map.get(id);
      if (r) {
        [r.p, r.e, r.sx, r.sy, r.sw, r.sh].forEach((s) => s.destroy());
        map.delete(id);
      }
    });

    commitRenderedRows(orderedIdsRef.current.filter((id) => map.has(id)));
  }, [commitRenderedRows, getWindowBounds]);

  const registerRowRefs = useCallback((id: string, refs: RowDomRefs | null) => {
    const r = managedMapRef.current.get(id);
    if (!r) return;
    if (refs) {
      r.refs = refs;
      r.lastDcTabIndex = null;
      r.lastApplied = null;
      applyRowStyles(r, viewModeRef.current);
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
      r.lastApplied = null;
    }
  }, []);

  // Fast scroll-only window synchronization (zero computeRowTargets work)
  const syncWindowOnScroll = useCallback(() => {
    const map = managedMapRef.current;
    const membersList = matchingRef.current;
    const targets = latestTargetsRef.current;
    const expanded = expandedRef.current;
    const openId = openMemberIdRef.current;
    const focusedId = focusedIdRef.current;
    const { minY, maxY, hasScroller } = getWindowBounds(0);
    if (!hasScroller) return;

    const keepBounds = getWindowBounds(WINDOW_HYSTERESIS_PX);
    const nextOrderedIds: string[] = [];
    let changed = false;

    for (let i = 0; i < membersList.length; i++) {
      const m = membersList[i];
      const tgt = targets.get(m.id);
      if (!tgt) continue;

      const existing = map.get(m.id);
      const isSpecial = m.id === openId || m.id === focusedId || expanded.has(m.id);
      const inWin = isSpecial || doesRowOverlapWindow(tgt.y, tgt.h, tgt.eTarget > 0, minY, maxY);

      if (inWin) {
        if (!existing) {
          // Scrolled into view smoothly — mount snapped at current target with p = 100
          const r: ManagedRow = {
            id: m.id,
            member: m,
            p: new Sp(100, TUNES.rowPresence),
            e: new Sp(tgt.eTarget, TUNES.rowExpand),
            sx: new Sp(tgt.x, TUNES.rowPosition),
            sy: new Sp(tgt.y, TUNES.rowPosition),
            sw: new Sp(tgt.w, TUNES.rowPosition),
            sh: new Sp(tgt.h, TUNES.rowPosition),
            fresh: false,
            isMatching: true,
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
          map.set(m.id, r);
          changed = true;
        } else {
          existing.member = m;
        }
        nextOrderedIds.push(m.id);
      } else if (existing) {
        // Keep moving or still within hysteresis band; prune idle out-of-band rows
        const inKeep = doesRowOverlapWindow(tgt.y, tgt.h, tgt.eTarget > 0, keepBounds.minY, keepBounds.maxY);
        const settled =
          existing.p.rest() &&
          existing.e.rest() &&
          existing.sx.rest() &&
          existing.sy.rest() &&
          existing.sw.rest() &&
          existing.sh.rest();

        if (!inKeep && settled) {
          [existing.p, existing.e, existing.sx, existing.sy, existing.sw, existing.sh].forEach((s) =>
            s.destroy()
          );
          map.delete(m.id);
          changed = true;
        } else {
          nextOrderedIds.push(m.id);
        }
      }
    }

    // Preserve any currently collapsing exiting rows
    map.forEach((r, id) => {
      if (!r.isMatching) {
        nextOrderedIds.push(id);
      }
    });

    if (changed) {
      commitRenderedRows(nextOrderedIds);
    }
  }, [commitRenderedRows, getWindowBounds]);

  // Place function: recomputes O(N) targets, manages active windowed springs, preserves retarget velocity
  const place = useCallback(
    (snapWidthChange = false) => {
      const map = managedMapRef.current;
      const membersList = matchingRef.current;
      const expanded = expandedRef.current;
      const mode = viewModeRef.current;
      const openId = openMemberIdRef.current;
      const focusedId = focusedIdRef.current;

      if (rowsElRef.current && rowsElRef.current.clientWidth > 0) {
        containerWidthRef.current = rowsElRef.current.clientWidth;
      }

      const W = containerWidthRef.current || 1200;
      const matchingIds = new Array<string>(membersList.length);
      for (let i = 0; i < membersList.length; i++) {
        matchingIds[i] = membersList[i].id;
      }
      const matchingSet = new Set(matchingIds);

      const { targets, totalHeight } = computeRowTargets(matchingIds, expanded, W, mode);

      if (rowsElRef.current) {
        rowsElRef.current.dataset.v = mode === 'grid' ? 'g' : 'l';
        rowsElRef.current.style.height = `${Math.max(0, totalHeight)}px`;
      }

      const initialLoad = isInitialPaintRef.current;
      isInitialPaintRef.current = false;

      // Prune selection for ANY hidden member (including off-screen ones)
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

      for (let i = 0; i < membersList.length; i++) {
        const m = membersList[i];
        const tgt = targets.get(m.id)!;
        let r = map.get(m.id);

        const isNewMatch = !initialLoad && !prevMatch.has(m.id);
        const isSpecial = m.id === openId || m.id === focusedId || expanded.has(m.id);
        const targetInWin =
          !hasScroller ||
          isSpecial ||
          doesRowOverlapWindow(tgt.y, tgt.h, tgt.eTarget > 0, minY, maxY);

        const currentInWin = r
          ? !hasScroller ||
            doesRowOverlapWindow(r.sy.x, r.sh.x, r.e.x > 0.01, keepBounds.minY, keepBounds.maxY)
          : false;

        const prevTgt = prevTargets.get(m.id);
        const prevInWin = prevTgt
          ? !hasScroller ||
            doesRowOverlapWindow(prevTgt.y, prevTgt.h, prevTgt.eTarget > 0, minY, maxY)
          : false;

        if (!r && (targetInWin || prevInWin)) {
          // Newly visible row:
          // - If newly matched by filter -> grow p: 0 -> 100 at tgt
          // - Else if morphed into view from previous off-screen coordinates -> fly from prevTgt to tgt
          // - Else (initial mount or idle scroll) -> snap cleanly
          const startPos = !isNewMatch && prevTgt ? prevTgt : tgt;
          const startP = isNewMatch ? 0 : 100;
          const startE = initialLoad ? tgt.eTarget : prevTgt ? prevTgt.eTarget : tgt.eTarget;

          r = {
            id: m.id,
            member: m,
            p: new Sp(startP, TUNES.rowPresence),
            e: new Sp(startE, TUNES.rowExpand),
            sx: new Sp(startPos.x, TUNES.rowPosition),
            sy: new Sp(startPos.y, TUNES.rowPosition),
            sw: new Sp(startPos.w, TUNES.rowPosition),
            sh: new Sp(startPos.h, TUNES.rowPosition),
            fresh: Boolean(isNewMatch || initialLoad),
            isMatching: true,
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
          map.set(m.id, r);
        }

        if (r) {
          if (!targetInWin && !currentInWin && !isSpecial) {
            // Completely off-screen before and after: destroy springs immediately
            [r.p, r.e, r.sx, r.sy, r.sw, r.sh].forEach((s) => s.destroy());
            map.delete(m.id);
            continue;
          }

          r.member = m;
          r.isMatching = true;
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
            r.sx.snap();
            r.sw.snap();
          }

          nextOrderedIds.push(m.id);
        }
      }

      // Non-matching rows still mounted collapse in place; off-screen exiting rows are dropped
      map.forEach((r, id) => {
        if (!matchingSet.has(id)) {
          const inWin =
            !hasScroller ||
            doesRowOverlapWindow(r.sy.x, r.sh.x, r.e.x > 0.01, keepBounds.minY, keepBounds.maxY);
          if (!inWin) {
            [r.p, r.e, r.sx, r.sy, r.sw, r.sh].forEach((s) => s.destroy());
            map.delete(id);
            return;
          }
          r.isMatching = false;
          r.p.setTarget(0);
          r.e.setTarget(0);
          nextOrderedIds.push(id);
        }
      });

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
    [commitRenderedRows, drawAll, getWindowBounds, rowsElRef]
  );

  // Subscribe drawAll & cleanupAll to the single shared rAF loop
  useEffect(() => {
    const unsubDraw = subscribeFrame(drawAll);
    const unsubClean = subscribeCleanup(cleanupAll);
    return () => {
      unsubDraw();
      unsubClean();
    };
  }, [drawAll, cleanupAll]);

  // Track keyboard-focused row so scrolling never unmounts focused controls
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

  // rAF-coalesced scroll listener for smooth O(visible) virtualization
  useEffect(() => {
    const scr = scrollContainerRef?.current;
    if (!scr) return;
    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        syncWindowOnScroll();
      });
    };
    scr.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scr.removeEventListener('scroll', onScroll);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
    };
  }, [scrollContainerRef, syncWindowOnScroll]);

  // Observe container width without causing React state loops during rAF
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
        const w = Math.round(entry.contentRect.width);
        if (w > 0 && Math.abs(w - prevW) > 1) {
          prevW = w;
          containerWidthRef.current = w;
          place(true);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [rowsElRef, place]);

  // Recompute row targets whenever list, expanded set, or view mode changes
  useEffect(() => {
    const filterChanged = prevFilterKeyRef.current !== filterKey;
    prevFilterKeyRef.current = filterKey;

    if (filterChanged) {
      onFilterChangeRef.current?.();
    }

    place(false);
  }, [matchingMembers, expandedMemberIds, viewMode, filterKey, place]);

  // Destroy all springs on unmount
  useEffect(() => {
    return () => {
      managedMapRef.current.forEach((r) => {
        [r.p, r.e, r.sx, r.sy, r.sw, r.sh].forEach((s) => s.destroy());
      });
      managedMapRef.current.clear();
    };
  }, []);

  return {
    renderedRows,
    registerRowRefs,
    hasVisibleRows: matchingMembers.length > 0,
  };
}
