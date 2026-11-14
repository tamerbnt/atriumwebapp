import { useEffect, useRef } from 'react';

/**
 * Defers localStorage serialization to idle/micro-debounced browser frames and
 * skips redundant initial-mount writes for faster dashboard and screen mounts.
 */
export function useIdlePersist<T>(key: string, value: T): void {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Ignore storage quota or serialization errors
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(
        flush,
        { timeout: 300 }
      );
    } else {
      timeoutId = setTimeout(flush, 80);
    }

    return () => {
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [key, value]);
}
