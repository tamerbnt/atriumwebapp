/**
 * Fluid Auto-Hiding Scrollbar Controller
 *
 * Ensures scrollbars across the application:
 * 1. Remain completely invisible when idle (no visual clutter or static scroll tracks).
 * 2. Smoothly fade into view ONLY while the user is actively scrolling.
 * 3. Smoothly fade back out to transparent when scrolling stops.
 * 4. Ensures fluid, momentum-based scrolling across all view containers.
 */

let isInitialized = false;
let globalScrollTimer: ReturnType<typeof setTimeout> | null = null;
let docScrollingActive = false;
const activeElementTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

export function initFluidScrollbar(): () => void {
  if (typeof window === 'undefined' || isInitialized) {
    return () => {};
  }
  isInitialized = true;

  const setDocScrolling = (active: boolean) => {
    if (docScrollingActive === active) return;
    docScrollingActive = active;
    if (active) {
      document.documentElement.classList.add('is-scrolling');
      document.documentElement.setAttribute('data-scrolling', 'true');
    } else {
      document.documentElement.classList.remove('is-scrolling');
      document.documentElement.removeAttribute('data-scrolling');
    }
  };

  const onScrollActivity = (e: Event) => {
    const target = e.target;
    if (target && target instanceof HTMLElement && target !== document.body && target !== document.documentElement) {
      const existing = activeElementTimers.get(target);
      if (existing) {
        clearTimeout(existing);
      } else {
        target.classList.add('is-scrolling');
        target.setAttribute('data-scrolling', 'true');
      }

      const elTimer = setTimeout(() => {
        target.classList.remove('is-scrolling');
        target.removeAttribute('data-scrolling');
        activeElementTimers.delete(target);
      }, 850);
      activeElementTimers.set(target, elTimer);
      return;
    }

    setDocScrolling(true);
    if (globalScrollTimer) clearTimeout(globalScrollTimer);
    globalScrollTimer = setTimeout(() => {
      setDocScrolling(false);
      globalScrollTimer = null;
    }, 850);
  };

  // Capture scroll events across containers (passive; zero forced reflow)
  window.addEventListener('scroll', onScrollActivity, { capture: true, passive: true });
  window.addEventListener('wheel', onScrollActivity, { capture: true, passive: true });
  window.addEventListener('touchmove', onScrollActivity, { capture: true, passive: true });

  return () => {
    window.removeEventListener('scroll', onScrollActivity, { capture: true });
    window.removeEventListener('wheel', onScrollActivity, { capture: true });
    window.removeEventListener('touchmove', onScrollActivity, { capture: true });
    if (globalScrollTimer) clearTimeout(globalScrollTimer);
    setDocScrolling(false);
    isInitialized = false;
  };
}
