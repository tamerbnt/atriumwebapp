import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowDown } from 'lucide-react';
import { useTranslation } from '../../utils/useTranslation';

export interface ScrollJumpPillProps {
  /** Optional target scroll container ref. If omitted, targets targetContainerId or #main-content-scroll */
  containerRef?: React.RefObject<HTMLElement | null>;
  /** Optional target container ID (defaults to 'main-content-scroll') */
  targetContainerId?: string;
  /** Minimum overflow in px before pill becomes active. Defaults to 120 */
  overflowThreshold?: number;
  /** Distance from bottom in px where direction flips to 'up'. Defaults to 140 */
  bottomThreshold?: number;
  /** Explicit override for bulk toolbar offset */
  hasActiveBulkBar?: boolean;
  /** Custom classes */
  className?: string;
  /** Hide text label on small screens (always show icon) */
  compact?: boolean;
}

/**
 * Universal Smart Scroll Jump Pill
 * 
 * Automatically detects scroll overflow across lists, tables, card grids, and calendars.
 * Dynamically toggles between:
 * - Down arrow (↓) to smoothly glide to the bottom
 * - Up arrow (↑) to smoothly glide to the top
 * 
 * Positioned bottom-center, fully localized (FR / AR / EN), and automatically
 * elevates when floating bulk action toolbars are visible.
 */
export const ScrollJumpPill: React.FC<ScrollJumpPillProps> = ({
  containerRef,
  targetContainerId = 'main-content-scroll',
  overflowThreshold = 40,
  bottomThreshold = 140,
  hasActiveBulkBar,
  className = '',
  compact = false,
}) => {
  const { t, isRtl } = useTranslation();
  const [hasOverflow, setHasOverflow] = useState(false);
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const [isVisible, setIsVisible] = useState(false);
  const rafIdRef = useRef<number | null>(null);

  const hasOverflowRef = useRef(false);
  const isVisibleRef = useRef(false);
  const directionRef = useRef<'down' | 'up'>('down');

  // Resolve target DOM element
  const getContainer = useCallback((): HTMLElement | null => {
    if (containerRef?.current) return containerRef.current;
    if (targetContainerId) {
      const el = document.getElementById(targetContainerId);
      if (el) return el;
    }
    // Fallback: look for #main-content-scroll or main scroll element
    return document.getElementById('main-content-scroll') || document.querySelector('main') || document.documentElement;
  }, [containerRef, targetContainerId]);

  // Update scroll metrics with stable hysteresis
  const updateMetrics = useCallback(() => {
    rafIdRef.current = null;
    const container = getContainer();
    if (!container) return;

    const scrollTop = container === document.documentElement ? window.scrollY : container.scrollTop;
    const clientHeight = container === document.documentElement ? window.innerHeight : container.clientHeight;
    const scrollHeight = container === document.documentElement ? document.body.scrollHeight : container.scrollHeight;

    const maxScroll = Math.max(0, scrollHeight - clientHeight);
    const overflowExists = maxScroll > overflowThreshold;

    if (!overflowExists) {
      if (hasOverflowRef.current) {
        hasOverflowRef.current = false;
        setHasOverflow(false);
      }
      if (isVisibleRef.current) {
        isVisibleRef.current = false;
        setIsVisible(false);
      }
      return;
    }

    if (!hasOverflowRef.current) {
      hasOverflowRef.current = true;
      setHasOverflow(true);
    }
    if (!isVisibleRef.current) {
      isVisibleRef.current = true;
      setIsVisible(true);
    }

    const distanceToBottom = maxScroll - scrollTop;
    const prevDirection = directionRef.current;
    let nextDirection = prevDirection;

    if (scrollTop < 80) {
      nextDirection = 'down';
    } else if (distanceToBottom < 80) {
      nextDirection = 'up';
    } else if (prevDirection === 'down' && distanceToBottom <= bottomThreshold) {
      nextDirection = 'up';
    } else if (prevDirection === 'up' && scrollTop <= bottomThreshold) {
      nextDirection = 'down';
    }

    if (nextDirection !== prevDirection) {
      directionRef.current = nextDirection;
      setDirection(nextDirection);
    }
  }, [getContainer, overflowThreshold, bottomThreshold]);

  // Scroll listener coalesced via requestAnimationFrame + ResizeObserver
  useEffect(() => {
    const container = getContainer();
    if (!container) return;

    const onScrollOrResize = () => {
      if (rafIdRef.current !== null) return;
      rafIdRef.current = requestAnimationFrame(updateMetrics);
    };

    // Initial check
    updateMetrics();

    // Listen on container or window
    const targetEventElement = container === document.documentElement ? window : container;
    targetEventElement.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    // ResizeObserver tracks dynamic content height changes without subtree DOM mutation overhead
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onScrollOrResize);
      ro.observe(container);
      if (container.firstElementChild) {
        ro.observe(container.firstElementChild);
      }
    }

    return () => {
      targetEventElement.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      ro?.disconnect();
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [getContainer, updateMetrics]);

  // Smooth scroll handler
  const handleScrollJump = () => {
    const container = getContainer();
    if (!container) return;

    if (direction === 'down') {
      const scrollHeight = container === document.documentElement ? document.body.scrollHeight : container.scrollHeight;
      if (container === document.documentElement) {
        window.scrollTo({ top: scrollHeight, behavior: 'smooth' });
      } else {
        container.scrollTo({ top: scrollHeight, behavior: 'smooth' });
      }
    } else {
      if (container === document.documentElement) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  if (!hasOverflow || !isVisible) {
    return null;
  }

  const label =
    direction === 'down'
      ? t('scroll_jump_bottom', 'Défiler vers le bas')
      : t('scroll_jump_top', 'Défiler vers le haut');

  const hasFixed = className.includes('fixed');
  const positionClass = hasFixed ? 'fixed' : 'absolute';
  const bottomPlacement = hasActiveBulkBar ? 'bottom-24' : 'bottom-6';

  return (
    <div
      className={`${positionClass} ${bottomPlacement} left-1/2 -translate-x-1/2 z-40 transition-[bottom,transform,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-auto select-none ${className}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <button
        type="button"
        onClick={handleScrollJump}
        aria-label={label}
        title={label}
        className="group relative flex items-center justify-center h-10 min-w-10 px-2 group-hover:ps-2.5 group-hover:pe-4 group-focus-visible:ps-2.5 group-focus-visible:pe-4 rounded-full bg-white dark:bg-neutral-900 text-black dark:text-white border border-neutral-200/90 dark:border-neutral-700/90 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.12),0_4px_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5)] hover:border-[#d4522f]/80 hover:shadow-[0_10px_28px_-4px_rgba(212,82,47,0.25)] hover:scale-[1.04] active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4522f] overflow-hidden"
      >
        {/* Animated Direction Arrow Icon */}
        <span
          className="w-6 h-6 rounded-full bg-[#d4522f]/15 dark:bg-[#d4522f]/25 text-[#d4522f] dark:text-[#E09070] flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:bg-[#d4522f] group-hover:text-white shrink-0"
          style={{
            transform: direction === 'up' ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <ArrowDown className="w-3.5 h-3.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" />
        </span>

        {/* Microcopy Label - icon only at rest, fluidly reveals on hover / focus */}
        {!compact && (
          <span className="max-w-0 opacity-0 overflow-hidden whitespace-nowrap text-xs font-medium text-black/85 dark:text-white group-hover:max-w-48 group-hover:opacity-100 group-hover:ms-2 group-focus-visible:max-w-48 group-focus-visible:opacity-100 group-focus-visible:ms-2 group-hover:text-[#d4522f] dark:group-hover:text-[#E09070] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none pointer-events-none">
            {label}
          </span>
        )}
      </button>
    </div>
  );
};
