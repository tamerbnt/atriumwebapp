import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseSkeletonLoadingOptions {
  isLoading: boolean;
  delayMs?: number;        // Debounce window to prevent fast-network skeleton flicker (default: 180ms)
  minDisplayMs?: number;   // Minimum time skeleton stays visible once rendered (default: 300ms)
  timeoutMs?: number;      // Maximum duration before falling back to local cache (default: 3500ms)
  hasCachedData?: boolean; // When true, enables instant fallback on timeout
  onTimeout?: () => void;
}

export interface SkeletonLoadingResult {
  showSkeleton: boolean;
  isTimedOut: boolean;
  isOffline: boolean;
  retry: () => void;
}

export function useSkeletonLoading({
  isLoading,
  delayMs = 180,
  minDisplayMs = 300,
  timeoutMs = 3500,
  hasCachedData = false,
  onTimeout,
}: UseSkeletonLoadingOptions): SkeletonLoadingResult {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  const shownTimestampRef = useRef<number | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minDisplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offlineDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Online / Offline listener with debounce to prevent flapping
  useEffect(() => {
    const handleStatusChange = () => {
      if (offlineDebounceRef.current) clearTimeout(offlineDebounceRef.current);
      offlineDebounceRef.current = setTimeout(() => {
        setIsOffline(!navigator.onLine);
      }, 400);
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      if (offlineDebounceRef.current) clearTimeout(offlineDebounceRef.current);
    };
  }, []);

  // Watchdog timeout effect
  useEffect(() => {
    if (isLoading && !isTimedOut && timeoutMs > 0) {
      timeoutTimerRef.current = setTimeout(() => {
        setIsTimedOut(true);
        if (onTimeout) onTimeout();
      }, timeoutMs);
    } else if (!isLoading) {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      setIsTimedOut(false);
    }

    return () => {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    };
  }, [isLoading, isTimedOut, timeoutMs, onTimeout]);

  // Flicker prevention & minimum display floor lifecycle
  useEffect(() => {
    if (isLoading && !isTimedOut) {
      // Delay initial skeleton rendering to avoid flicker on fast data arrival (<180ms)
      delayTimerRef.current = setTimeout(() => {
        setShowSkeleton(true);
        shownTimestampRef.current = Date.now();
      }, delayMs);
    } else {
      // Data arrived or timed out
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }

      if (shownTimestampRef.current !== null) {
        const elapsed = Date.now() - shownTimestampRef.current;
        const remaining = Math.max(0, minDisplayMs - elapsed);

        if (remaining > 0) {
          minDisplayTimerRef.current = setTimeout(() => {
            setShowSkeleton(false);
            shownTimestampRef.current = null;
          }, remaining);
        } else {
          setShowSkeleton(false);
          shownTimestampRef.current = null;
        }
      } else {
        setShowSkeleton(false);
      }
    }

    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (minDisplayTimerRef.current) clearTimeout(minDisplayTimerRef.current);
    };
  }, [isLoading, isTimedOut, delayMs, minDisplayMs]);

  const retry = useCallback(() => {
    setIsTimedOut(false);
  }, []);

  // If timed out and we have cached data, bypass skeleton to reveal cached data immediately
  const effectiveShowSkeleton = showSkeleton && !(isTimedOut && hasCachedData);

  return {
    showSkeleton: effectiveShowSkeleton,
    isTimedOut,
    isOffline,
    retry,
  };
}
