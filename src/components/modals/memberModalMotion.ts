/**
 * Pure math, spring checkpoints, and origin calculators for MemberModal.
 * Zero React/DOM side effects — verified directly via `node:test`.
 */

import {
  MODAL_SPRING_COEFFS,
  KINETIC_MODAL_START_SCALE,
  KINETIC_MODAL_SCALE_RANGE,
  KINETIC_MODAL_CLOSE_X_THRESHOLD,
  clamp,
  computeKineticModalMetrics,
  computeKineticModalTransformOrigin,
  shouldFinishModalClosing,
} from '../ui/kinetic/kineticMath';

export { MODAL_SPRING_COEFFS, clamp };
export const MODAL_SPRING_TUNE = 28;
export const MODAL_START_SCALE = KINETIC_MODAL_START_SCALE;
export const MODAL_SCALE_RANGE = KINETIC_MODAL_SCALE_RANGE;
export const MODAL_CLOSE_DQ_THRESHOLD = KINETIC_MODAL_CLOSE_X_THRESHOLD / 100;
export const MODAL_SCRIM_CLICK_GUARD_MS = 140;
export const MODAL_FOCUS_DELAY_MS = 30;
export const MODAL_REDUCED_FADE_MS = 85;

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

/**
 * Maps spring dp (0..100) directly to root scrim+dialog opacity and dialog scale.
 */
export function computeMemberModalMetrics(
  dpX: number,
  reducedMotion = false
): ModalVisualMetrics {
  const m = computeKineticModalMetrics(dpX, reducedMotion);
  return {
    dq: m.p,
    opacity: m.opacity,
    scale: m.scale,
    transform: reducedMotion ? 'scale(1)' : `scale(${m.scale})`,
  };
}

/**
 * Returns true as soon as the closing spring drops below close threshold (~133ms, no bounce).
 */
export function shouldFinishClosing(dpX: number, dpTarget: number): boolean {
  return shouldFinishModalClosing(dpX, dpTarget);
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
  return computeKineticModalTransformOrigin(triggerRect, dialogRect, viewportW, viewportH);
}

/**
 * Guards against synthetic/touch click-through during the first 140ms after opening,
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
  prefillName?: string;
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
