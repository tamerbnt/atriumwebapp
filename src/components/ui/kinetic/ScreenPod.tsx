import React, { createContext, useMemo } from 'react';

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

function createScreenPodBridgeStore(): ScreenPodBridgeStore {
  let activeOwner: symbol | null = null;
  let current: ScreenPodToolbarSnapshot | null = null;
  let callbacks: { onSearchChange?: (q: string) => void; onResetAllFilters?: () => void } = {};
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => current,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    syncToolbar: (ownerId, next, nextCallbacks) => {
      activeOwner = ownerId;
      callbacks = nextCallbacks;
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
}

export const ScreenPod: React.FC<ScreenPodProps> = React.memo(({ children, className = '' }) => {
  const store = useMemo(() => createScreenPodBridgeStore(), []);

  return (
    <ScreenPodBridgeContext.Provider value={store}>
      <div className="sq-elev-card">
        <div
          data-sq="panel"
          data-sq-border="solid"
          className={`relative bg-[#F3EDE7] dark:bg-[#141312] p-[var(--pod-pad,12px)] flex flex-col gap-[var(--card-gap,12px)] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#33302D] ${className}`}
        >
          {children}
        </div>
      </div>
    </ScreenPodBridgeContext.Provider>
  );
});

ScreenPod.displayName = 'ScreenPod';
