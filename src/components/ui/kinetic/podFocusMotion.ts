import { Spring } from '../../../atrium/motion/spring';
import { Body, wake, unschedule } from '../../../atrium/motion/loop';
import { motion } from '../../../atrium/motion/env';

const f2 = (n: number): string => (Math.round(n * 100) / 100).toString();
const f3 = (n: number): string => (Math.round(n * 1000) / 1000).toString();

/**
 * Single-commit FLIP compositor glide for the active list ScreenPod when
 * collapsing or restoring the KPI/summary pods above it.
 *
 * Layout flips once inside React (and ResizeObserver updates squircle paths
 * once), then PodFlipGlideBody translates the pod wrapper from `deltaY -> 0`
 * on the GPU compositor thread (`translate3d`), clearing all inline styles in
 * `onSleep()`.
 */
export class PodFlipGlideBody implements Body {
  private y = new Spring(0, 190, 0.86);

  constructor(readonly el: HTMLElement) {}

  glideFrom(deltaY: number): void {
    if (
      !this.el.isConnected ||
      Math.abs(deltaY) < 0.75 ||
      motion.reduced ||
      motion.instant
    ) {
      unschedule(this);
      this.clearStyles();
      return;
    }

    this.el.style.willChange = 'transform';
    this.el.style.position = 'relative';
    this.el.style.zIndex = '2';
    this.y.x = deltaY;
    this.y.v = 0;
    this.y.t = 0;
    this.render();
    wake(this);
  }

  step(dt: number): void {
    this.y.t = 0;
    this.y.step(dt);
  }

  render(): void {
    this.el.style.transform = `translate3d(0,${f2(this.y.x)}px,0)`;
  }

  settled(): boolean {
    this.y.t = 0;
    return this.y.calm(0.25, 0.5);
  }

  snap(): void {
    this.y.t = 0;
    this.y.snap();
  }

  isVisible(): boolean {
    return this.el.isConnected;
  }

  onSleep(): void {
    this.clearStyles();
  }

  dispose(): void {
    unschedule(this);
    this.clearStyles();
  }

  private clearStyles(): void {
    this.el.style.transform = '';
    this.el.style.willChange = '';
    this.el.style.position = '';
    this.el.style.zIndex = '';
  }
}

/**
 * Smooth compositor reveal (`opacity 0 -> 1`, `translate3d(0, -14px -> 0, 0)`)
 * for KPI banners and auxiliary upper pods when restoring from expanded view.
 */
export class UpperPodRevealBody implements Body {
  private p = new Spring(1, 200, 0.88);

  constructor(readonly el: HTMLElement) {}

  reveal(): void {
    if (!this.el.isConnected || motion.reduced || motion.instant) {
      unschedule(this);
      this.clearStyles();
      return;
    }
    this.el.style.willChange = 'transform, opacity';
    this.p.x = 0;
    this.p.v = 0;
    this.p.t = 1;
    this.render();
    wake(this);
  }

  step(dt: number): void {
    this.p.t = 1;
    this.p.step(dt);
  }

  render(): void {
    const p = Math.max(0, Math.min(1, this.p.x));
    const ty = (1 - p) * -14;
    this.el.style.opacity = f3(p);
    this.el.style.transform = `translate3d(0,${f2(ty)}px,0)`;
  }

  settled(): boolean {
    this.p.t = 1;
    return this.p.calm(0.002, 0.01);
  }

  snap(): void {
    this.p.t = 1;
    this.p.snap();
  }

  isVisible(): boolean {
    return this.el.isConnected;
  }

  onSleep(): void {
    this.clearStyles();
  }

  dispose(): void {
    unschedule(this);
    this.clearStyles();
  }

  private clearStyles(): void {
    this.el.style.opacity = '';
    this.el.style.transform = '';
    this.el.style.willChange = '';
  }
}

/**
 * Inert ghost exit compositor body (`opacity 1 -> 0`, `translate3d(0, 0 -> -16px, 0)`).
 * Removes the transient ghost container automatically on sleep.
 */
export class UpperGhostExitBody implements Body {
  private p = new Spring(0, 215, 0.88);

  constructor(readonly layerEl: HTMLElement) {}

  play(): void {
    if (!this.layerEl.isConnected || motion.reduced || motion.instant) {
      this.dispose();
      return;
    }
    this.layerEl.style.willChange = 'transform, opacity';
    this.p.x = 0;
    this.p.v = 0;
    this.p.t = 1;
    this.render();
    wake(this);
  }

  step(dt: number): void {
    this.p.t = 1;
    this.p.step(dt);
  }

  render(): void {
    const p = Math.max(0, Math.min(1, this.p.x));
    const ty = -16 * p;
    this.layerEl.style.opacity = f3(1 - p);
    this.layerEl.style.transform = `translate3d(0,${f2(ty)}px,0)`;
  }

  settled(): boolean {
    this.p.t = 1;
    return this.p.calm(0.002, 0.01);
  }

  snap(): void {
    this.p.t = 1;
    this.p.snap();
  }

  isVisible(): boolean {
    return this.layerEl.isConnected;
  }

  onSleep(): void {
    this.layerEl.remove();
  }

  dispose(): void {
    unschedule(this);
    if (this.layerEl.isConnected) {
      this.layerEl.remove();
    }
  }
}

/**
 * Builds an inert, squircle-safe clone of a collapsing KPI banner or upper pod
 * positioned at its exact pre-collapse rect inside the screen root container.
 * Converts `data-sq` attributes to `data-sq-ghost="true"` BEFORE DOM insertion
 * so `initSquircleEngine` MutationObserver never registers ResizeObservers on
 * the transient clone while preserving existing clip-paths and stroke SVGs.
 */
export function buildCollapseGhostClone(
  sourceEl: HTMLElement,
  rect: DOMRect,
  rootRect: DOMRect
): HTMLElement {
  const clone = sourceEl.cloneNode(true) as HTMLElement;

  const sanitizeSqAndIds = (el: Element) => {
    if (el.hasAttribute('id')) el.removeAttribute('id');
    if (el.hasAttribute('aria-live')) el.removeAttribute('aria-live');
    const sq = el.getAttribute('data-sq');
    if (sq && sq !== 'none') {
      el.removeAttribute('data-sq');
      el.setAttribute('data-sq-ghost', 'true');
    }
  };

  sanitizeSqAndIds(clone);
  const descendants = clone.querySelectorAll('*');
  for (let i = 0; i < descendants.length; i++) {
    sanitizeSqAndIds(descendants[i]);
  }

  clone.setAttribute('aria-hidden', 'true');
  clone.style.position = 'absolute';
  clone.style.left = `${f2(rect.left - rootRect.left)}px`;
  clone.style.top = `${f2(rect.top - rootRect.top)}px`;
  clone.style.width = `${f2(rect.width)}px`;
  clone.style.height = `${f2(rect.height)}px`;
  clone.style.margin = '0';
  clone.style.pointerEvents = 'none';

  return clone;
}

/**
 * Marks a single list pod as the active print target, invokes `window.print()`,
 * and cleans up print markers via `afterprint`.
 */
export function printPodElement(podEl?: HTMLElement | null): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const stale = document.querySelectorAll('[data-printing-pod="true"]');
  stale.forEach((node) => node.removeAttribute('data-printing-pod'));
  document.documentElement.removeAttribute('data-printing-active-pod');

  if (podEl) {
    podEl.setAttribute('data-printing-pod', 'true');
    document.documentElement.setAttribute('data-printing-active-pod', 'true');
  }

  const cleanup = () => {
    if (podEl) podEl.removeAttribute('data-printing-pod');
    document.documentElement.removeAttribute('data-printing-active-pod');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  try {
    window.print();
  } finally {
    // Fallback cleanup for environments where `afterprint` may be deferred or skipped
    window.setTimeout(cleanup, 1200);
  }
}
