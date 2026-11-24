import type { RectLike } from './kineticMath';

interface CapturedTrigger {
  el: HTMLElement;
  rect: RectLike;
  time: number;
}

const TRIGGER_TTL_MS = 450;
let lastTrigger: CapturedTrigger | null = null;
let listenersInstalled = false;

function isUsableRect(rect: RectLike | null | undefined): rect is RectLike {
  if (!rect) return false;
  return rect.width > 0 && rect.height > 0 && rect.width < 900 && rect.height < 400;
}

function findInteractiveElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  if (target.closest('[data-kinetic-scrim="true"]')) return null;

  const interactive = target.closest(
    'button, [role="button"], a[href], [role="menuitem"], [data-action], [data-row-id], tr, [tabindex]:not([tabindex="-1"])'
  );
  if (interactive instanceof HTMLElement) {
    return interactive;
  }
  return target instanceof HTMLElement ? target : null;
}

function captureElementTrigger(el: HTMLElement | null): void {
  if (!el || el === document.body || el === document.documentElement) return;
  const r = el.getBoundingClientRect();
  if (!isUsableRect(r)) return;
  lastTrigger = {
    el,
    rect: { left: r.left, top: r.top, width: r.width, height: r.height },
    time: performance.now(),
  };
}

export function ensureModalTriggerTracking(): void {
  if (listenersInstalled || typeof document === 'undefined') return;
  listenersInstalled = true;

  document.addEventListener(
    'pointerdown',
    (e: PointerEvent) => {
      const el = findInteractiveElement(e.target);
      captureElementTrigger(el);
    },
    { capture: true, passive: true }
  );

  document.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const active = document.activeElement;
        if (active instanceof HTMLElement) {
          captureElementTrigger(findInteractiveElement(active));
        }
      }
    },
    { capture: true, passive: true }
  );
}

export function resolveModalOrigin(
  explicitEl?: HTMLElement | null
): { element: HTMLElement | null; rect: RectLike | null } {
  if (typeof document === 'undefined') {
    return { element: null, rect: null };
  }
  ensureModalTriggerTracking();

  if (explicitEl && explicitEl.isConnected) {
    const r = explicitEl.getBoundingClientRect();
    if (isUsableRect(r)) {
      return {
        element: explicitEl,
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      };
    }
  }

  const now = performance.now();
  if (lastTrigger && now - lastTrigger.time <= TRIGGER_TTL_MS) {
    if (lastTrigger.el.isConnected) {
      const r = lastTrigger.el.getBoundingClientRect();
      if (isUsableRect(r)) {
        return {
          element: lastTrigger.el,
          rect: { left: r.left, top: r.top, width: r.width, height: r.height },
        };
      }
    }
    return {
      element: lastTrigger.el.isConnected ? lastTrigger.el : null,
      rect: lastTrigger.rect,
    };
  }

  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    active !== document.body &&
    active !== document.documentElement &&
    !active.closest('[role="dialog"], [role="alertdialog"]')
  ) {
    const r = active.getBoundingClientRect();
    if (isUsableRect(r)) {
      return {
        element: active,
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      };
    }
  }

  return { element: null, rect: null };
}
