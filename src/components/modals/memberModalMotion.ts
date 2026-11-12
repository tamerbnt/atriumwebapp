/**
 * Pure math, spring checkpoints, and origin calculators for MemberModal.
 * Zero React/DOM side effects — verified directly via `node:test`.
 */

export const MODAL_SPRING_TUNE = 28; // k = 0.08 + 0.28*0.16 = 0.1248, d = 0.62 + 0.28*0.20 = 0.676
export const MODAL_START_SCALE = 0.72;
export const MODAL_SCALE_RANGE = 0.28;
export const MODAL_CLOSE_DQ_THRESHOLD = 0.01;
export const MODAL_SCRIM_CLICK_GUARD_MS = 150;
export const MODAL_FOCUS_DELAY_MS = 30;
export const MODAL_REDUCED_FADE_MS = 80;

export type ModalLifecycleState = 'closed' | 'opening' | 'open' | 'closing';

export interface ModalRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ModalVisualMetrics {
  dq: number;
  opacity: number;
  scale: number;
  transform: string;
}

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

/**
 * Maps spring dp (0..100, overshoots to ~109 -> dq clamped to 1.1)
 * directly to root scrim+dialog opacity and dialog scale.
 */
export function computeMemberModalMetrics(
  dpX: number,
  reducedMotion = false
): ModalVisualMetrics {
  const dq = clamp(dpX / 100, 0, 1.1);
  const opacity = clamp(dq * 1.4, 0, 1);
  const scale = reducedMotion ? 1 : MODAL_START_SCALE + MODAL_SCALE_RANGE * dq;

  return {
    dq,
    opacity,
    scale,
    transform: reducedMotion ? 'scale(1)' : `scale(${scale})`,
  };
}

/**
 * Returns true as soon as the closing spring drops below dq < 0.01 (~130ms, no bounce).
 */
export function shouldFinishClosing(dpX: number, dpTarget: number): boolean {
  if (dpTarget !== 0) return false;
  const dq = clamp(dpX / 100, 0, 1.1);
  return dq < MODAL_CLOSE_DQ_THRESHOLD;
}

/**
 * Computes transform-origin relative to the unscaled dialog's top-left corner
 * so the dialog grows directly out of the trigger button's center.
 * Falls back to 'center center' if trigger is missing, zero-sized, or off-screen.
 */
export function computeModalTransformOrigin(
  triggerRect: ModalRect | null,
  dialogRect: ModalRect | null,
  viewportW: number,
  viewportH: number
): string {
  if (!triggerRect || !dialogRect) return 'center center';
  if (triggerRect.width <= 0 || triggerRect.height <= 0) return 'center center';
  if (dialogRect.width <= 0 || dialogRect.height <= 0) return 'center center';

  const triggerRight = triggerRect.left + triggerRect.width;
  const triggerBottom = triggerRect.top + triggerRect.height;

  const isOffScreen =
    triggerBottom <= 0 ||
    triggerRect.top >= viewportH ||
    triggerRight <= 0 ||
    triggerRect.left >= viewportW;

  if (isOffScreen) return 'center center';

  const cx = triggerRect.left + triggerRect.width / 2;
  const cy = triggerRect.top + triggerRect.height / 2;
  const ox = cx - dialogRect.left;
  const oy = cy - dialogRect.top;

  return `${ox}px ${oy}px`;
}

/**
 * Guards against synthetic/touch click-through during the first 150ms after opening,
 * and ensures both mousedown and mouseup occurred on the scrim element itself.
 */
export function shouldCloseOnScrimMouseUp(
  mousedownOnScrim: boolean,
  mouseupOnScrim: boolean,
  nowMs: number,
  openedAtMs: number
): boolean {
  if (!mousedownOnScrim || !mouseupOnScrim) return false;
  return nowMs - openedAtMs >= MODAL_SCRIM_CLICK_GUARD_MS;
}

export interface KineticMemberModalTriggerPayload<T = any> {
  member: T | null;
  originElement?: HTMLElement | null;
}

type KineticModalHandler = (payload: KineticMemberModalTriggerPayload) => void;
let kineticModalHandler: KineticModalHandler | null = null;

export function registerKineticMemberModalOpener(handler: KineticModalHandler): () => void {
  kineticModalHandler = handler;
  return () => {
    if (kineticModalHandler === handler) {
      kineticModalHandler = null;
    }
  };
}

export function triggerKineticMemberModal(payload: KineticMemberModalTriggerPayload): boolean {
  if (!kineticModalHandler) return false;
  kineticModalHandler(payload);
  return true;
}

