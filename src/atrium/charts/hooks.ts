import React, { useEffect, useState, useCallback, useRef } from 'react';

type RevealCallback = (visible: boolean) => void;

const observerRegistry = new WeakMap<Element, RevealCallback>();
let sharedObserver: IntersectionObserver | null = null;

function getSharedObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
    return null;
  }
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            const cb = observerRegistry.get(entry.target);
            if (cb) {
              cb(true);
              observerRegistry.delete(entry.target);
              sharedObserver?.unobserve(entry.target);
            }
          }
        }
      },
      { rootMargin: '40px 0px', threshold: 0.05 }
    );
  }
  return sharedObserver;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Shared single-IntersectionObserver hook for lazy below-the-fold chart entrance.
 * Immediately reveals when reduced motion is active or IO is unavailable.
 */
export function useInViewReveal(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return prefersReducedMotion() || typeof IntersectionObserver === 'undefined';
  });

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) {
      setVisible(true);
      return;
    }

    const observer = getSharedObserver();
    if (!observer) {
      setVisible(true);
      return;
    }

    observerRegistry.set(node, () => setVisible(true));
    observer.observe(node);

    return () => {
      observerRegistry.delete(node);
      observer.unobserve(node);
    };
  }, [visible]);

  return [ref, visible];
}

/**
 * Keyboard scrubber for 1D charts (sparklines, stacked bars, area trends, histogram, etc.)
 * Respects RTL direction on ArrowLeft / ArrowRight.
 */
export function useChartKeyboardScrub(
  length: number,
  activeIndex: number | null,
  setActiveIndex: (index: number | null) => void,
  isRtl = false
) {
  return useCallback(
    (e: React.KeyboardEvent) => {
      if (length <= 0) return;
      const forwardKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
      const backKey = isRtl ? 'ArrowRight' : 'ArrowLeft';

      if (e.key === forwardKey) {
        e.preventDefault();
        const next = activeIndex === null ? 0 : Math.min(length - 1, activeIndex + 1);
        setActiveIndex(next);
      } else if (e.key === backKey) {
        e.preventDefault();
        const prev = activeIndex === null ? length - 1 : Math.max(0, activeIndex - 1);
        setActiveIndex(prev);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActiveIndex(length - 1);
      } else if (e.key === 'Escape') {
        setActiveIndex(null);
      }
    },
    [length, activeIndex, setActiveIndex, isRtl]
  );
}

/**
 * Resolve effective RTL flag from locale prop + document direction.
 */
export function useIsRtl(locale?: 'fr' | 'en' | 'ar'): boolean {
  if (locale === 'ar') return true;
  if (typeof document !== 'undefined') {
    return document.documentElement.getAttribute('dir') === 'rtl';
  }
  return false;
}
