import React, {
  createContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useScreenFocus } from './ScreenFocusContext';

export interface ScreenPodToolbarSnapshot {
  searchQuery: string;
  hasSearchSetter: boolean;
  statusValue?: string;
  hasActiveAdvancedFilters: boolean;
  activeFilterLabels: string[];
  chipKey: string;
  hasReset: boolean;
  totalCount?: number;
}

export interface ScreenPodBridgeStore {
  podId: string;
  getSnapshot: () => ScreenPodToolbarSnapshot | null;
  subscribe: (listener: () => void) => () => void;
  syncToolbar: (
    ownerId: symbol,
    snapshot: ScreenPodToolbarSnapshot,
    callbacks: { onSearchChange?: (q: string) => void; onResetAllFilters?: () => void }
  ) => void;
  clearToolbar: (ownerId: symbol) => void;
  clearSearch: () => void;
  resetFilters: () => void;
}

export const ScreenPodBridgeContext = createContext<ScreenPodBridgeStore | null>(null);

function createScreenPodBridgeStore(
  podId: string,
  onHasToolbarChange?: (has: boolean) => void
): ScreenPodBridgeStore {
  let activeOwner: symbol | null = null;
  let current: ScreenPodToolbarSnapshot | null = null;
  let callbacks: { onSearchChange?: (q: string) => void; onResetAllFilters?: () => void } = {};
  const listeners = new Set<() => void>();

  return {
    podId,
    getSnapshot: () => current,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    syncToolbar: (ownerId, next, nextCallbacks) => {
      const hadOwner = activeOwner !== null;
      activeOwner = ownerId;
      callbacks = nextCallbacks;
      if (!hadOwner) {
        onHasToolbarChange?.(true);
      }
      const changed =
        !current ||
        current.searchQuery !== next.searchQuery ||
        current.hasSearchSetter !== next.hasSearchSetter ||
        current.statusValue !== next.statusValue ||
        current.hasActiveAdvancedFilters !== next.hasActiveAdvancedFilters ||
        current.chipKey !== next.chipKey ||
        current.hasReset !== next.hasReset ||
        current.totalCount !== next.totalCount;
      if (changed) {
        current = next;
        listeners.forEach((l) => l());
      }
    },
    clearToolbar: (ownerId) => {
      if (activeOwner === ownerId) {
        activeOwner = null;
        current = null;
        callbacks = {};
        onHasToolbarChange?.(false);
      }
    },
    clearSearch: () => {
      callbacks.onSearchChange?.('');
    },
    resetFilters: () => {
      callbacks.onResetAllFilters?.();
    },
  };
}

export interface ScreenPodProps {
  children: React.ReactNode;
  className?: string;
  podRole?: 'list' | 'auxiliary';
  collapsibleWhenExpanded?: boolean;
}

export const ScreenPod: React.FC<ScreenPodProps> = React.memo(
  ({ children, className = '', podRole, collapsibleWhenExpanded }) => {
    const podId = useId();
    const focusCtx = useScreenFocus();
    const outerRef = useRef<HTMLDivElement>(null);
    const [hasToolbar, setHasToolbar] = useState(false);

    const store = useMemo(
      () => createScreenPodBridgeStore(podId, setHasToolbar),
      [podId]
    );

    const isExpanded = Boolean(focusCtx?.isExpanded);
    const isCollapsed = Boolean(isExpanded && focusCtx?.collapsedPodIds.has(podId));
    const isExpandedActive = Boolean(isExpanded && !isCollapsed);

    useLayoutEffect(() => {
      if (!focusCtx) return;
      focusCtx.registerPod(podId, {
        el: isCollapsed ? null : outerRef.current,
        hasToolbar,
        podRole,
        collapsibleWhenExpanded,
      });
    }, [focusCtx, podId, isCollapsed, hasToolbar, podRole, collapsibleWhenExpanded]);

    useLayoutEffect(() => {
      if (!focusCtx) return;
      return () => {
        focusCtx.unregisterPod(podId);
      };
    }, [focusCtx, podId]);

    if (isCollapsed) {
      return null;
    }

    return (
      <ScreenPodBridgeContext.Provider value={store}>
        <div
          ref={outerRef}
          data-list-pod-id={podId}
          data-list-pod-active={isExpandedActive ? 'true' : undefined}
          className={isExpandedActive ? 'flex-1 min-h-0 flex flex-col' : undefined}
        >
          <div
            data-sq="panel"
            data-sq-border="solid"
            className={`relative bg-[#F3EDE7] dark:bg-[#141312] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)] ${
              isExpandedActive ? 'flex-1 min-h-0' : ''
            } ${className}`}
          >
            {children}
          </div>
        </div>
      </ScreenPodBridgeContext.Provider>
    );
  }
);

ScreenPod.displayName = 'ScreenPod';

