import { useEffect, useRef } from 'react';
import {
  calculateRubberBandOffset,
  stepSpring1D,
  DEFAULT_APPLE_SPRING,
  SpringConfig,
} from '../utils/applePhysics';

export interface UseAppleOverscrollOptions extends SpringConfig {
  direction?: 'vertical' | 'horizontal' | 'both';
  enabled?: boolean;
  targetContentSelector?: string; // If set, transforms this child instead of immediate children
}

export function useAppleOverscroll(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseAppleOverscrollOptions = {}
) {
  const {
    direction = 'vertical',
    enabled = true,
    stiffness = DEFAULT_APPLE_SPRING.stiffness,
    damping = DEFAULT_APPLE_SPRING.damping,
    mass = DEFAULT_APPLE_SPRING.mass,
    maxBounce = DEFAULT_APPLE_SPRING.maxBounce,
    targetContentSelector,
  } = options;

  const springConfig = { stiffness, damping, mass, maxBounce };

  // Current physical offsets and velocities
  const offsets = useRef({ x: 0, y: 0 });
  const rawDeltas = useRef({ x: 0, y: 0 });
  const velocities = useRef({ x: 0, y: 0 });
  const animFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const wheelTimeoutRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    // Detect target element to apply transform to
    const getTargetEl = (): HTMLElement | null => {
      if (targetContentSelector) {
        return container.querySelector(targetContentSelector) as HTMLElement | null;
      }
      return (container.firstElementChild as HTMLElement) || container;
    };

    const applyTransform = (x: number, y: number) => {
      const target = getTargetEl();
      if (!target) return;

      if (x === 0 && y === 0) {
        target.style.transform = '';
        target.style.willChange = '';
      } else {
        target.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
        target.style.willChange = 'transform';
      }
    };

    const stopSpring = () => {
      if (animFrameId.current !== null) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
    };

    const startSpring = () => {
      stopSpring();
      lastTimeRef.current = performance.now();

      const loop = (now: number) => {
        const dt = Math.min((now - lastTimeRef.current) / 1000, 0.033);
        lastTimeRef.current = now;

        let settledX = true;
        let settledY = true;

        if (direction === 'horizontal' || direction === 'both') {
          const stepX = stepSpring1D(offsets.current.x, velocities.current.x, 0, dt, springConfig);
          offsets.current.x = stepX.pos;
          velocities.current.x = stepX.vel;
          settledX = stepX.settled;
        }

        if (direction === 'vertical' || direction === 'both') {
          const stepY = stepSpring1D(offsets.current.y, velocities.current.y, 0, dt, springConfig);
          offsets.current.y = stepY.pos;
          velocities.current.y = stepY.vel;
          settledY = stepY.settled;
        }

        applyTransform(offsets.current.x, offsets.current.y);

        if (settledX && settledY) {
          offsets.current.x = 0;
          offsets.current.y = 0;
          velocities.current.x = 0;
          velocities.current.y = 0;
          rawDeltas.current.x = 0;
          rawDeltas.current.y = 0;
          applyTransform(0, 0);
          animFrameId.current = null;
        } else {
          animFrameId.current = requestAnimationFrame(loop);
        }
      };

      animFrameId.current = requestAnimationFrame(loop);
    };

    // Wheel event handler (trackpad & mouse wheel)
    const handleWheel = (e: WheelEvent) => {
      // Check if container or child opts out
      if ((e.target as HTMLElement)?.closest?.('[data-no-rubber-band]')) return;

      const scrollTop = container.scrollTop;
      const maxScrollY = Math.max(0, container.scrollHeight - container.clientHeight);
      const scrollLeft = container.scrollLeft;
      const maxScrollX = Math.max(0, container.scrollWidth - container.clientWidth);

      let deltaY = e.deltaY;
      let deltaX = e.deltaX;

      // Handle line or page deltaModes
      if (e.deltaMode === 1) {
        deltaY *= 20;
        deltaX *= 20;
      } else if (e.deltaMode === 2) {
        deltaY *= container.clientHeight;
        deltaX *= container.clientWidth;
      }

      const isAtTop = scrollTop <= 0.5 && deltaY < 0;
      const isAtBottom = scrollTop >= maxScrollY - 0.5 && deltaY > 0;
      const isAtLeft = scrollLeft <= 0.5 && deltaX < 0;
      const isAtRight = scrollLeft >= maxScrollX - 0.5 && deltaX > 0;

      const allowsY = direction === 'vertical' || direction === 'both';
      const allowsX = direction === 'horizontal' || direction === 'both';

      const isOverscrollingY = allowsY && (isAtTop || isAtBottom || offsets.current.y !== 0);
      const isOverscrollingX = allowsX && (isAtLeft || isAtRight || offsets.current.x !== 0);

      if (!isOverscrollingY && !isOverscrollingX) {
        return; // Allow native in-bounds scrolling
      }

      // Interrupt any running spring return
      stopSpring();

      if (isOverscrollingY) {
        // Invert deltaY: scrolling down past bottom pushes content up (-y)
        rawDeltas.current.y -= deltaY * 0.7;
        offsets.current.y = calculateRubberBandOffset(
          rawDeltas.current.y,
          container.clientHeight,
          0.55,
          maxBounce
        );
        velocities.current.y = -deltaY * 0.5;
      }

      if (isOverscrollingX) {
        rawDeltas.current.x -= deltaX * 0.7;
        offsets.current.x = calculateRubberBandOffset(
          rawDeltas.current.x,
          container.clientWidth,
          0.55,
          maxBounce
        );
        velocities.current.x = -deltaX * 0.5;
      }

      applyTransform(offsets.current.x, offsets.current.y);

      // Debounce release: when wheel ticks stop, spring back
      if (wheelTimeoutRef.current !== null) {
        window.clearTimeout(wheelTimeoutRef.current);
      }
      wheelTimeoutRef.current = window.setTimeout(() => {
        rawDeltas.current.x = 0;
        rawDeltas.current.y = 0;
        startSpring();
      }, 70);
    };

    // Touch event handlers for mobile & touchscreens
    const handleTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement)?.closest?.('[data-no-rubber-band]')) return;
      if (e.touches.length !== 1) return;

      stopSpring();
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaX = touch.clientX - touchStartRef.current.x;

      const scrollTop = container.scrollTop;
      const maxScrollY = Math.max(0, container.scrollHeight - container.clientHeight);
      const scrollLeft = container.scrollLeft;
      const maxScrollX = Math.max(0, container.scrollWidth - container.clientWidth);

      const isAtTop = scrollTop <= 0.5 && deltaY > 0;
      const isAtBottom = scrollTop >= maxScrollY - 0.5 && deltaY < 0;
      const isAtLeft = scrollLeft <= 0.5 && deltaX > 0;
      const isAtRight = scrollLeft >= maxScrollX - 0.5 && deltaX < 0;

      const allowsY = direction === 'vertical' || direction === 'both';
      const allowsX = direction === 'horizontal' || direction === 'both';

      const isOverscrollingY = allowsY && (isAtTop || isAtBottom);
      const isOverscrollingX = allowsX && (isAtLeft || isAtRight);

      if (isOverscrollingY) {
        rawDeltas.current.y = deltaY;
        offsets.current.y = calculateRubberBandOffset(
          rawDeltas.current.y,
          container.clientHeight,
          0.55,
          maxBounce
        );
      }

      if (isOverscrollingX) {
        rawDeltas.current.x = deltaX;
        offsets.current.x = calculateRubberBandOffset(
          rawDeltas.current.x,
          container.clientWidth,
          0.55,
          maxBounce
        );
      }

      if (isOverscrollingY || isOverscrollingX) {
        applyTransform(offsets.current.x, offsets.current.y);
      }
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
      rawDeltas.current.x = 0;
      rawDeltas.current.y = 0;
      if (offsets.current.x !== 0 || offsets.current.y !== 0) {
        startSpring();
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      stopSpring();
      if (wheelTimeoutRef.current !== null) {
        window.clearTimeout(wheelTimeoutRef.current);
      }
      applyTransform(0, 0);
    };
  }, [containerRef, enabled, direction, stiffness, damping, mass, maxBounce, targetContentSelector]);
}
