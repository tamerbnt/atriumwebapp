import React, { useEffect, useRef } from 'react';
import {
  calculateRubberBandOffset,
  stepSpring1D,
  DEFAULT_APPLE_SPRING,
  APPLE_RESISTANCE_COEFFICIENT,
} from '../../utils/applePhysics';

interface ActiveOverscroll {
  container: HTMLElement;
  target: HTMLElement;
  direction: 'y' | 'x';
  edgeSign: 1 | -1; // 1 = pulling from start edge (top/left, positive offset), -1 = pulling from end edge (bottom/right, negative offset)
  rawDelta: number;
  targetOffset: number;
  offset: number;
  velocity: number;
  isReleasing: boolean;
}

/**
 * Universal Apple Rubber-Band Overscroll Provider
 * Automatically detects any scrollable container across all current and future screens
 * and applies authentic iOS/macOS spring resistance and bounce physics.
 */
export const AppleOverscrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const activeRef = useRef<ActiveOverscroll | null>(null);
  const animFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const wheelTimeoutRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; target: HTMLElement | null } | null>(null);

  useEffect(() => {
    // Respect user's reduced-motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const styleCache = new WeakMap<
      HTMLElement,
      { overflowY: string; overflowX: string; obY: string; obX: string; ts: number }
    >();

    // Helper: Find the scrollable container that should either scroll natively or rubber-band
    // deltaSign: < 0 means scrolling toward start (top/left), > 0 means scrolling toward end (bottom/right)
    const resolveScrollContainer = (
      el: HTMLElement | null,
      axis: 'y' | 'x',
      deltaSign: number
    ): { container: HTMLElement; canScrollNatively: boolean; edgeSign: 1 | -1 } | null => {
      let current = el;
      let fallbackEdge: { container: HTMLElement; edgeSign: 1 | -1 } | null = null;
      const now = performance.now();

      while (current && current !== document.body && current !== document.documentElement) {
        if (current.hasAttribute('data-no-rubber-band')) {
          return null;
        }

        const isY = axis === 'y';
        const sizeDiff = isY
          ? current.scrollHeight - current.clientHeight
          : current.scrollWidth - current.clientWidth;

        if (sizeDiff > 2) {
          let cached = styleCache.get(current);
          if (!cached || now - cached.ts > 400) {
            const style = window.getComputedStyle(current);
            cached = {
              overflowY: style.overflowY,
              overflowX: style.overflowX,
              obY: style.overscrollBehaviorY,
              obX: style.overscrollBehaviorX,
              ts: now,
            };
            styleCache.set(current, cached);
          }
          const overflowProp = isY ? cached.overflowY : cached.overflowX;

          if (overflowProp === 'auto' || overflowProp === 'scroll') {
            const pos = isY ? current.scrollTop : current.scrollLeft;
            const max = Math.max(0, sizeDiff);
            const atStart = pos <= 1;
            const atEnd = pos >= max - 1;
            const atEdgeInDirection = (deltaSign < 0 && atStart) || (deltaSign > 0 && atEnd);
            const edgeSign: 1 | -1 = deltaSign < 0 ? 1 : -1;

            if (!atEdgeInDirection) {
              return { container: current, canScrollNatively: true, edgeSign };
            }

            if (!fallbackEdge) {
              fallbackEdge = { container: current, edgeSign };
            }

            const overscrollBehavior = isY ? cached.obY : cached.obX;
            if (overscrollBehavior === 'contain' || overscrollBehavior === 'none') {
              return { container: current, canScrollNatively: false, edgeSign };
            }
            // Otherwise overscroll-behavior is 'auto': keep walking up to see if an ancestor can scroll natively
          }
        }

        current = current.parentElement;
      }

      if (fallbackEdge) {
        return { container: fallbackEdge.container, canScrollNatively: false, edgeSign: fallbackEdge.edgeSign };
      }
      return null;
    };

    const stopLoop = () => {
      if (animFrameId.current !== null) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
    };

    const applyTransform = (active: ActiveOverscroll) => {
      const { target, direction, offset } = active;
      if (Math.abs(offset) < 0.05) {
        target.style.transform = '';
        target.style.willChange = '';
      } else {
        const x = direction === 'x' ? offset.toFixed(2) : '0';
        const y = direction === 'y' ? offset.toFixed(2) : '0';
        target.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        target.style.willChange = 'transform';
      }
    };

    const clearActive = () => {
      stopLoop();
      if (activeRef.current) {
        applyTransform({ ...activeRef.current, offset: 0 });
        activeRef.current = null;
      }
    };

    const startLoop = () => {
      if (animFrameId.current !== null) return;
      lastTimeRef.current = performance.now();

      const loop = (now: number) => {
        const currentActive = activeRef.current;
        if (!currentActive) {
          animFrameId.current = null;
          return;
        }

        const dt = Math.min(Math.max((now - lastTimeRef.current) / 1000, 0.001), 0.033);
        lastTimeRef.current = now;

        if (!currentActive.isReleasing) {
          // Smoothly chase targetOffset during active wheel input (eliminates harsh 1-frame jumps on stepped mouse wheels)
          const diff = currentActive.targetOffset - currentActive.offset;
          const chaseAlpha = 1 - Math.exp(-24 * dt);
          const nextOffset = currentActive.offset + diff * chaseAlpha;
          currentActive.velocity = (nextOffset - currentActive.offset) / dt;
          currentActive.offset = nextOffset;
          applyTransform(currentActive);

          if (Math.abs(diff) < 0.05 && Math.abs(currentActive.targetOffset) < 0.05) {
            currentActive.offset = 0;
            currentActive.velocity = 0;
            applyTransform(currentActive);
            activeRef.current = null;
            animFrameId.current = null;
            return;
          }

          animFrameId.current = requestAnimationFrame(loop);
          return;
        }

        const step = stepSpring1D(
          currentActive.offset,
          currentActive.velocity,
          0,
          dt,
          DEFAULT_APPLE_SPRING
        );

        currentActive.offset = step.pos;
        currentActive.velocity = step.vel;
        applyTransform(currentActive);

        if (step.settled) {
          clearActive();
        } else {
          animFrameId.current = requestAnimationFrame(loop);
        }
      };

      animFrameId.current = requestAnimationFrame(loop);
    };

    const triggerRelease = () => {
      const active = activeRef.current;
      if (!active) return;
      active.rawDelta = 0;
      active.targetOffset = 0;
      active.isReleasing = true;
      if (Math.abs(active.offset) < 0.05) {
        clearActive();
      } else {
        startLoop();
      }
    };

    // Global Wheel Listener (Trackpads and Mouse Wheels)
    const handleGlobalWheel = (e: WheelEvent) => {
      const targetEl = e.target as HTMLElement | null;
      if (!targetEl || targetEl.closest?.('[data-no-rubber-band]')) return;

      const isVerticalDominant = Math.abs(e.deltaY) >= Math.abs(e.deltaX);
      const axis: 'y' | 'x' = isVerticalDominant ? 'y' : 'x';
      const rawAxisDelta = axis === 'y' ? e.deltaY : e.deltaX;
      if (Math.abs(rawAxisDelta) < 0.1) return;

      const resolved = resolveScrollContainer(targetEl, axis, rawAxisDelta);
      if (!resolved) return;

      const { container, canScrollNatively, edgeSign } = resolved;

      let delta = rawAxisDelta;
      if (e.deltaMode === 1) delta *= 18;
      else if (e.deltaMode === 2) delta *= axis === 'y' ? container.clientHeight : container.clientWidth;

      const isAlreadyOverscrolling =
        activeRef.current &&
        activeRef.current.container === container &&
        activeRef.current.direction === axis &&
        Math.abs(activeRef.current.offset) > 0.05;

      if (canScrollNatively && !isAlreadyOverscrolling) {
        return; // Allow native in-bounds scrolling
      }

      if (
        !activeRef.current ||
        activeRef.current.container !== container ||
        activeRef.current.direction !== axis
      ) {
        if (activeRef.current) {
          clearActive();
        }
        const transformTarget = (container.firstElementChild as HTMLElement) || container;
        activeRef.current = {
          container,
          target: transformTarget,
          direction: axis,
          edgeSign,
          rawDelta: 0,
          targetOffset: 0,
          offset: 0,
          velocity: 0,
          isReleasing: false,
        };
      }

      const active = activeRef.current;
      active.isReleasing = false;

      // Soft wheel gain with per-event impulse clamp so discrete wheel clicks glide rather than jump
      const scaledImpulse = Math.max(-52, Math.min(52, -delta * 0.45));
      const nextRaw = active.rawDelta + scaledImpulse;

      // Never allow opposite-direction wheel input to flip rubber-band past zero into the wrong side
      if ((active.edgeSign > 0 && nextRaw <= 0) || (active.edgeSign < 0 && nextRaw >= 0)) {
        active.rawDelta = 0;
        active.targetOffset = 0;
        active.isReleasing = true;
      } else {
        active.rawDelta = nextRaw;
        const dimension = axis === 'y' ? container.clientHeight : container.clientWidth;
        active.targetOffset = calculateRubberBandOffset(
          active.rawDelta,
          dimension,
          APPLE_RESISTANCE_COEFFICIENT,
          DEFAULT_APPLE_SPRING.maxBounce
        );
      }

      startLoop();

      // Debounce spring back when wheel ticks pause
      if (wheelTimeoutRef.current !== null) {
        window.clearTimeout(wheelTimeoutRef.current);
      }
      wheelTimeoutRef.current = window.setTimeout(() => {
        triggerRelease();
      }, 95);
    };

    // Global Touch Listeners (Mobile & Touch Devices)
    const handleGlobalTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const targetEl = e.target as HTMLElement | null;
      if (!targetEl || targetEl.closest?.('[data-no-rubber-band]')) return;

      stopLoop();
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        target: targetEl,
      };
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      const isVertical = Math.abs(deltaY) >= Math.abs(deltaX);
      const axis: 'y' | 'x' = isVertical ? 'y' : 'x';
      const touchDelta = axis === 'y' ? deltaY : deltaX;
      if (Math.abs(touchDelta) < 0.5) return;

      // Positive touchDelta drags content down/right (toward scrollTop = 0, so scroll direction is negative)
      const scrollDeltaSign = -touchDelta;
      const resolved = resolveScrollContainer(touchStartRef.current.target, axis, scrollDeltaSign);
      if (!resolved || resolved.canScrollNatively) return;

      const { container, edgeSign } = resolved;

      if (
        !activeRef.current ||
        activeRef.current.container !== container ||
        activeRef.current.direction !== axis
      ) {
        if (activeRef.current) {
          clearActive();
        }
        const transformTarget = (container.firstElementChild as HTMLElement) || container;
        activeRef.current = {
          container,
          target: transformTarget,
          direction: axis,
          edgeSign,
          rawDelta: 0,
          targetOffset: 0,
          offset: 0,
          velocity: 0,
          isReleasing: false,
        };
      }

      const active = activeRef.current;
      active.isReleasing = false;
      active.rawDelta = touchDelta;

      const dimension = axis === 'y' ? container.clientHeight : container.clientWidth;
      const nextOffset = calculateRubberBandOffset(
        active.rawDelta,
        dimension,
        APPLE_RESISTANCE_COEFFICIENT,
        DEFAULT_APPLE_SPRING.maxBounce
      );
      active.targetOffset = nextOffset;
      active.offset = nextOffset;
      active.velocity = 0;

      applyTransform(active);
    };

    const handleGlobalTouchEnd = () => {
      touchStartRef.current = null;
      if (activeRef.current && Math.abs(activeRef.current.offset) > 0.05) {
        triggerRelease();
      } else if (activeRef.current) {
        clearActive();
      }
    };

    window.addEventListener('wheel', handleGlobalWheel, { passive: true });
    window.addEventListener('touchstart', handleGlobalTouchStart, { passive: true });
    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
    window.addEventListener('touchend', handleGlobalTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleGlobalTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
      window.removeEventListener('touchstart', handleGlobalTouchStart);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);
      if (wheelTimeoutRef.current !== null) {
        window.clearTimeout(wheelTimeoutRef.current);
      }
      clearActive();
    };
  }, []);

  return <>{children}</>;
};
