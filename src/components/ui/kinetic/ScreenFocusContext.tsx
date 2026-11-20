import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  toggleListPodExpandedAction,
  useAtriumSelector,
} from '../../../services/store';
import {
  PodFlipGlideBody,
  UpperGhostExitBody,
  UpperPodRevealBody,
  buildCollapseGhostClone,
  printPodElement,
} from './podFocusMotion';

export interface PodRegistrationMeta {
  id: string;
  el: HTMLElement | null;
  hasToolbar: boolean;
  podRole?: 'list' | 'auxiliary';
  collapsibleWhenExpanded?: boolean;
  order: number;
}

export interface ScreenFocusContextValue {
  eligible: boolean;
  isExpanded: boolean;
  activeListPodId: string | null;
  collapsedPodIds: ReadonlySet<string>;
  requestToggleExpand: (podId?: string | null) => void;
  printPod: (podId?: string | null) => void;
  registerUpperBanner: (id: string, el: HTMLElement | null) => void;
  registerPod: (
    id: string,
    meta: Omit<PodRegistrationMeta, 'id' | 'order'>
  ) => void;
  unregisterPod: (id: string) => void;
}

const ScreenFocusContext = createContext<ScreenFocusContextValue | null>(null);

interface PendingFocusTransition {
  kind: 'collapse' | 'restore';
  targetPodId: string | null;
  prevListTop: number;
  rootEl: HTMLElement | null;
  ghostLayer: HTMLElement | null;
}

export const ScreenFocusProvider: React.FC<{
  eligible?: boolean;
  children: React.ReactNode;
}> = ({ eligible = true, children }) => {
  const parentCtx = useContext(ScreenFocusContext);
  const effectiveEligible = parentCtx ? parentCtx.eligible && eligible : eligible;

  const isGlobalExpanded = useAtriumSelector((s) => s.isListPodExpanded);
  const isExpanded = effectiveEligible && isGlobalExpanded;

  const upperBannerRefs = useRef<Map<string, HTMLElement>>(new Map());
  const podRefs = useRef<Map<string, PodRegistrationMeta>>(new Map());
  const orderCounterRef = useRef(0);

  const [focusedPodId, setFocusedPodId] = useState<string | null>(null);
  const [topologyTick, setTopologyTick] = useState(0);

  const pendingTransitionRef = useRef<PendingFocusTransition | null>(null);
  const activeBodiesRef = useRef<{ dispose: () => void }[]>([]);

  const disposeBodies = useCallback(() => {
    const bodies = activeBodiesRef.current;
    if (bodies.length > 0) {
      for (let i = 0; i < bodies.length; i++) {
        bodies[i].dispose();
      }
      activeBodiesRef.current = [];
    }
  }, []);

  useEffect(() => {
    return () => {
      disposeBodies();
    };
  }, [disposeBodies]);

  const registerUpperBanner = useCallback(
    (id: string, el: HTMLElement | null) => {
      if (el) {
        upperBannerRefs.current.set(id, el);
      } else {
        upperBannerRefs.current.delete(id);
      }
    },
    []
  );

  const registerPod = useCallback(
    (id: string, meta: Omit<PodRegistrationMeta, 'id' | 'order'>) => {
      const existing = podRefs.current.get(id);
      const changed =
        !existing ||
        existing.el !== meta.el ||
        existing.hasToolbar !== meta.hasToolbar ||
        existing.podRole !== meta.podRole ||
        existing.collapsibleWhenExpanded !== meta.collapsibleWhenExpanded;

      podRefs.current.set(id, {
        id,
        el: meta.el,
        hasToolbar: meta.hasToolbar,
        podRole: meta.podRole,
        collapsibleWhenExpanded: meta.collapsibleWhenExpanded,
        order: existing ? existing.order : ++orderCounterRef.current,
      });

      if (changed) {
        setTopologyTick((t) => t + 1);
      }
    },
    []
  );

  const unregisterPod = useCallback((id: string) => {
    if (podRefs.current.delete(id)) {
      setTopologyTick((t) => t + 1);
    }
  }, []);

  // Resolve the active list pod deterministically from registered pods
  const resolveActivePodId = useCallback(
    (preferredId?: string | null): string | null => {
      const entries = Array.from(podRefs.current.values()).filter(
        (p) => p.el === null || p.el.isConnected
      );
      if (entries.length === 0) return null;

      if (preferredId && entries.some((p) => p.id === preferredId)) {
        return preferredId;
      }
      if (focusedPodId && entries.some((p) => p.id === focusedPodId)) {
        return focusedPodId;
      }

      const explicitList = entries.find((p) => p.podRole === 'list');
      if (explicitList) return explicitList.id;

      const toolbarPods = entries.filter((p) => p.hasToolbar);
      if (toolbarPods.length > 0) {
        return toolbarPods[toolbarPods.length - 1].id;
      }

      const nonAux = entries.filter((p) => p.podRole !== 'auxiliary');
      if (nonAux.length > 0) {
        return nonAux[nonAux.length - 1].id;
      }

      return entries[entries.length - 1].id;
    },
    [focusedPodId]
  );

  const activeListPodId = useMemo(
    () => (effectiveEligible ? resolveActivePodId() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveEligible, resolveActivePodId, topologyTick]
  );

  // Track which upper auxiliary pods sit vertically above the active list pod
  const [collapsedPodIds, setCollapsedPodIds] = useState<Set<string>>(
    () => new Set()
  );

  useLayoutEffect(() => {
    if (!isExpanded || !activeListPodId) {
      setCollapsedPodIds((prev) => (prev.size === 0 ? prev : new Set()));
      return;
    }

    const activeMeta = podRefs.current.get(activeListPodId);
    const activeRect = activeMeta?.el?.isConnected
      ? activeMeta.el.getBoundingClientRect()
      : null;

    const next = new Set<string>();
    podRefs.current.forEach((meta, id) => {
      if (id === activeListPodId) return;
      if (meta.collapsibleWhenExpanded === true) {
        next.add(id);
        return;
      }
      if (meta.collapsibleWhenExpanded === false || meta.hasToolbar) return;

      // Auto-collapse auxiliary non-toolbar pods strictly stacked ABOVE the active list pod
      // (never collapse side-by-side grid siblings like scanner + live log on FrontDeskKiosk)
      if (
        meta.el?.isConnected &&
        activeRect &&
        meta.order < (activeMeta?.order ?? Infinity)
      ) {
        const auxRect = meta.el.getBoundingClientRect();
        const isVerticallyAbove =
          auxRect.height > 0 &&
          auxRect.bottom <= activeRect.top + 24 &&
          Math.abs(auxRect.top - activeRect.top) > 36;
        if (isVerticallyAbove || meta.podRole === 'auxiliary') {
          next.add(id);
        }
      }
    });

    setCollapsedPodIds((prev) => {
      if (prev.size === next.size) {
        let same = true;
        prev.forEach((v) => {
          if (!next.has(v)) same = false;
        });
        if (same) return prev;
      }
      return next;
    });
  }, [isExpanded, activeListPodId, topologyTick]);

  const requestToggleExpand = useCallback(
    (podId?: string | null) => {
      if (!effectiveEligible) return;

      disposeBodies();

      const targetId = resolveActivePodId(podId);
      if (podId) {
        setFocusedPodId(podId);
      }

      const targetMeta = targetId ? podRefs.current.get(targetId) : undefined;
      const targetEl = targetMeta?.el ?? null;
      const rootEl =
        (targetEl?.closest('[data-list-pod-root="true"]') as HTMLElement | null) ||
        (document.querySelector('[data-list-pod-root="true"]') as HTMLElement | null);

      const rootRect = rootEl?.getBoundingClientRect() ?? null;
      const targetRect = targetEl?.isConnected
        ? targetEl.getBoundingClientRect()
        : null;
      const prevListTop =
        rootRect && targetRect ? targetRect.top - rootRect.top : 0;

      const willExpand = !isExpanded;
      let ghostLayer: HTMLElement | null = null;

      if (willExpand && rootEl && rootRect) {
        const clones: HTMLElement[] = [];

        upperBannerRefs.current.forEach((bannerEl) => {
          if (!bannerEl.isConnected) return;
          const r = bannerEl.getBoundingClientRect();
          if (r.height > 0 && r.width > 0) {
            clones.push(buildCollapseGhostClone(bannerEl, r, rootRect));
          }
        });

        podRefs.current.forEach((meta, id) => {
          if (id === targetId || !meta.el?.isConnected) return;
          const r = meta.el.getBoundingClientRect();
          if (r.height <= 0 || r.width <= 0) return;

          const shouldGhost =
            meta.collapsibleWhenExpanded === true ||
            (meta.collapsibleWhenExpanded !== false &&
              !meta.hasToolbar &&
              targetRect &&
              r.bottom <= targetRect.top + 24 &&
              Math.abs(r.top - targetRect.top) > 36);

          if (shouldGhost) {
            clones.push(buildCollapseGhostClone(meta.el, r, rootRect));
          }
        });

        if (clones.length > 0) {
          ghostLayer = document.createElement('div');
          ghostLayer.setAttribute('aria-hidden', 'true');
          ghostLayer.style.position = 'absolute';
          ghostLayer.style.inset = '0';
          ghostLayer.style.pointerEvents = 'none';
          ghostLayer.style.overflow = 'hidden';
          ghostLayer.style.zIndex = '1';
          clones.forEach((c) => ghostLayer!.appendChild(c));
        }
      }

      pendingTransitionRef.current = {
        kind: willExpand ? 'collapse' : 'restore',
        targetPodId: targetId,
        prevListTop,
        rootEl,
        ghostLayer,
      };

      toggleListPodExpandedAction();
    },
    [effectiveEligible, disposeBodies, resolveActivePodId, isExpanded]
  );

  // Run single-commit FLIP compositor animation synchronously before paint
  useLayoutEffect(() => {
    const pending = pendingTransitionRef.current;
    if (!pending) return;
    pendingTransitionRef.current = null;

    const { kind, targetPodId, prevListTop, rootEl, ghostLayer } = pending;

    if (kind === 'collapse' && ghostLayer && rootEl?.isConnected) {
      rootEl.appendChild(ghostLayer);
      const exitBody = new UpperGhostExitBody(ghostLayer);
      activeBodiesRef.current.push(exitBody);
      exitBody.play();
    }

    if (kind === 'restore') {
      upperBannerRefs.current.forEach((bannerEl) => {
        if (!bannerEl.isConnected) return;
        const rev = new UpperPodRevealBody(bannerEl);
        activeBodiesRef.current.push(rev);
        rev.reveal();
      });

      podRefs.current.forEach((meta, id) => {
        if (id === targetPodId || !meta.el?.isConnected) return;
        if (!meta.hasToolbar && meta.collapsibleWhenExpanded !== false) {
          const rev = new UpperPodRevealBody(meta.el);
          activeBodiesRef.current.push(rev);
          rev.reveal();
        }
      });
    }

    const resolvedId = resolveActivePodId(targetPodId);
    const activeEl = resolvedId ? podRefs.current.get(resolvedId)?.el : null;
    if (activeEl?.isConnected && rootEl?.isConnected) {
      const rootRect = rootEl.getBoundingClientRect();
      const nextRect = activeEl.getBoundingClientRect();
      const nextTop = nextRect.top - rootRect.top;
      const deltaY = prevListTop - nextTop;
      const glideBody = new PodFlipGlideBody(activeEl);
      activeBodiesRef.current.push(glideBody);
      glideBody.glideFrom(deltaY);
    }
  }, [isExpanded, resolveActivePodId]);

  const printPod = useCallback(
    (podId?: string | null) => {
      const id = resolveActivePodId(podId);
      const el = id ? podRefs.current.get(id)?.el ?? null : null;
      printPodElement(el);
    },
    [resolveActivePodId]
  );

  const value = useMemo<ScreenFocusContextValue>(
    () => ({
      eligible: effectiveEligible,
      isExpanded,
      activeListPodId,
      collapsedPodIds,
      requestToggleExpand,
      printPod,
      registerUpperBanner,
      registerPod,
      unregisterPod,
    }),
    [
      effectiveEligible,
      isExpanded,
      activeListPodId,
      collapsedPodIds,
      requestToggleExpand,
      printPod,
      registerUpperBanner,
      registerPod,
      unregisterPod,
    ]
  );

  return (
    <ScreenFocusContext.Provider value={value}>
      {children}
    </ScreenFocusContext.Provider>
  );
};

export function useScreenFocus(): ScreenFocusContextValue | null {
  return useContext(ScreenFocusContext);
}
