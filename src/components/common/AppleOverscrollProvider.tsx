import React, { useEffect, useRef } from 'react';
import {
  calculateRubberBandOffset,
  stepSpring1D,
  DEFAULT_APPLE_SPRING,
} from '../../utils/applePhysics';

interface ActiveOverscroll {
  container: HTMLElement;
  target: HTMLElement;
  direction: 'y' | 'x';
  rawDelta: number;
  offset: number;
  velocity: number;
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

    // Helper: Find closest scrollable ancestor
    const findScrollableAncestor = (
      el: HTMLElement | null,
      axis: 'y' | 'x'
    ): HTMLElement | null => {
      let current = el;
      while (current && current !== document.body && current !== document.documentElement) {
        if (current.hasAttribute('data-no-rubber-band')) {
          return null;
        }

        const style = window.getComputedStyle(current);
        if (axis === 'y') {
          const overflowY = style.overflowY;
          if (
            (overflowY === 'auto' || overflowY === 'scroll') &&
            current.scrollHeight > current.clientHeight + 2
          ) {
            return current;
          }
        } else {
          const overflowX = style.overflowX;
          if (
            (overflowX === 'auto' || overflowX === 'scroll') &&
            current.scrollWidth > current.clientWidth + 2
          ) {
            return current;
          }
        }
        current = current.parentElement;
      }
      return null;
    };

    const stopSpring = () => {
      if (animFrameId.current !== null) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
    };

    const applyTransform = (active: ActiveOverscroll) => {
      const { target, direction, offset } = active;
      if (offset === 0) {
        target.style.transform = '';
        target.style.willChange = '';
      } else {
        const x = direction === 'x' ? offset.toFixed(2) : '0';
        const y = direction === 'y' ? offset.toFixed(2) : '0';
        target.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        target.style.willChange = 'transform';
      }
    };

    const startSpring = () => {
      stopSpring();
      const active = activeRef.current;
      if (!active || active.offset === 0) return;

      lastTimeRef.current = performance.now();

      const loop = (now: number) => {
        const currentActive = activeRef.current;
        if (!currentActive) {
          animFrameId.current = null;
          return;
        }

        const dt = Math.min((now - lastTimeRef.current) / 1000, 0.033);
        lastTimeRef.current = now;

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
          applyTransform({ ...currentActive, offset: 0 });
          activeRef.current = null;
          animFrameId.current = null;
        } else {
          animFrameId.current = requestAnimationFrame(loop);
        }
      };

      animFrameId.current = requestAnimationFrame(loop);
    };

    // Global Wheel Listener (Trackpads and Mouse Wheels)
    const handleGlobalWheel = (e: WheelEvent) => {
      const targetEl = e.target as HTMLElement | null;
      if (!targetEl || targetEl.closest?.('[data-no-rubber-band]')) return;

      const isVerticalDominant = Math.abs(e.deltaY) >= Math.abs(e.deltaX);
      const axis: 'y' | 'x' = isVerticalDominant ? 'y' : 'x';
      const container = findScrollableAncestor(targetEl, axis);
      if (!container) return;

      let delta = axis === 'y' ? e.deltaY : e.deltaX;
      if (e.deltaMode === 1) delta *= 20;
      else if (e.deltaMode === 2) delta *= axis === 'y' ? container.clientHeight : container.clientWidth;

      if (Math.abs(delta) < 0.1) return;

      let atEdge = false;
      if (axis === 'y') {
        const scrollTop = container.scrollTop;
        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
        atEdge = (scrollTop <= 1 && delta < 0) || (scrollTop >= maxScroll - 1 && delta > 0);
      } else {
        const scrollLeft = container.scrollLeft;
        const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
        atEdge = (scrollLeft <= 1 && delta < 0) || (scrollLeft >= maxScroll - 1 && delta > 0);
      }

      // If active already on this container or hitting edge
      const isAlreadyOverscrolling =
        activeRef.current && activeRef.current.container === container && activeRef.current.offset !== 0;

      if (!atEdge && !isAlreadyOverscrolling) {
        return; // Allow native in-bounds scrolling
      }

      stopSpring();

      if (!activeRef.current || activeRef.current.container !== container) {
        const transformTarget = (container.firstElementChild as HTMLElement) || container;
        activeRef.current = {
          container,
          target: transformTarget,
          direction: axis,
          rawDelta: 0,
          offset: 0,
          velocity: 0,
        };
      }

      const active = activeRef.current;
      active.rawDelta -= delta * 0.7;

      const dimension = axis === 'y' ? container.clientHeight : container.clientWidth;
      active.offset = calculateRubberBandOffset(
        active.rawDelta,
        dimension,
        0.55,
        DEFAULT_APPLE_SPRING.maxBounce
      );
      active.velocity = -delta * 0.5;

      applyTransform(active);

      // Debounce spring back when wheel ticks end
      if (wheelTimeoutRef.current !== null) {
        window.clearTimeout(wheelTimeoutRef.current);
      }
      wheelTimeoutRef.current = window.setTimeout(() => {
        if (activeRef.current) {
          activeRef.current.rawDelta = 0;
          startSpring();
        }
      }, 75);
    };

    // Global Touch Listeners (Mobile & Touch Devices)
    const handleGlobalTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const targetEl = e.target as HTMLElement | null;
      if (!targetEl || targetEl.closest?.('[data-no-rubber-band]')) return;

      stopSpring();
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
      const container = findScrollableAncestor(touchStartRef.current.target, axis);
      if (!container) return;

      let atEdge = false;
      const touchDelta = axis === 'y' ? deltaY : deltaX;

      if (axis === 'y') {
        const scrollTop = container.scrollTop;
        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
        atEdge = (scrollTop <= 1 && deltaY > 0) || (scrollTop >= maxScroll - 1 && deltaY < 0);
      } else {
        const scrollLeft = container.scrollLeft;
        const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
        atEdge = (scrollLeft <= 1 && deltaX > 0) || (scrollLeft >= maxScroll - 1 && deltaX < 0);
      }

      if (!atEdge) return;

      if (!activeRef.current || activeRef.current.container !== container) {
        const transformTarget = (container.firstElementChild as HTMLElement) || container;
        activeRef.current = {
          container,
          target: transformTarget,
          direction: axis,
          rawDelta: 0,
          offset: 0,
          velocity: 0,
        };
      }

      const active = activeRef.current;
      active.rawDelta = touchDelta;

      const dimension = axis === 'y' ? container.clientHeight : container.clientWidth;
      active.offset = calculateRubberBandOffset(
        active.rawDelta,
        dimension,
        0.55,
        DEFAULT_APPLE_SPRING.maxBounce
      );

      applyTransform(active);
    };

    const handleGlobalTouchEnd = () => {
      touchStartRef.current = null;
      if (activeRef.current && activeRef.current.offset !== 0) {
        activeRef.current.rawDelta = 0;
        startSpring();
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
      stopSpring();
      if (wheelTimeoutRef.current !== null) {
        window.clearTimeout(wheelTimeoutRef.current);
      }
      if (activeRef.current) {
        applyTransform({ ...activeRef.current, offset: 0 });
        activeRef.current = null;
      }
    };
  }, []);

  return <>{children}</>;
};
