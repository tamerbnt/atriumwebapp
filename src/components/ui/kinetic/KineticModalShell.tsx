import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Sp,
  subscribeFrame,
  subscribeCleanup,
  wake,
  checkReducedMotion,
} from './kineticMotion';
import {
  MODAL_SPRING_COEFFS,
  KINETIC_MODAL_START_SCALE,
  KINETIC_MODAL_SETTLE_EPSILON,
  computeKineticModalMetrics,
  computeKineticModalTransformOrigin,
  shouldFinishModalClosing,
} from './kineticMath';
import { resolveModalOrigin } from './kineticModalTrigger';

const SCRIM_CLICK_GUARD_MS = 140;
const REDUCED_FADE_MS = 85;

// Module-level LIFO modal stack + ref-counted body scroll lock
const activeModalStack: symbol[] = [];
let scrollLockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

function acquireScrollLock(): void {
  if (typeof document === 'undefined') return;
  scrollLockCount += 1;
  if (scrollLockCount !== 1) return;
  const docEl = document.documentElement;
  const scrollbarW = Math.max(0, window.innerWidth - docEl.clientWidth);
  if (scrollbarW === 0 && docEl.scrollHeight <= docEl.clientHeight) {
    return;
  }
  savedOverflow = docEl.style.overflow;
  savedPaddingRight = docEl.style.paddingRight;
  docEl.style.overflow = 'hidden';
  if (scrollbarW > 0) {
    const computedPad = parseFloat(getComputedStyle(docEl).paddingRight || '0') || 0;
    docEl.style.paddingRight = `${computedPad + scrollbarW}px`;
  }
}

function releaseScrollLock(): void {
  if (typeof document === 'undefined' || scrollLockCount === 0) return;
  scrollLockCount -= 1;
  if (scrollLockCount === 0) {
    const docEl = document.documentElement;
    docEl.style.overflow = savedOverflow;
    docEl.style.paddingRight = savedPaddingRight;
  }
}

export function useRetainedModalValue<T>(value: T | null | undefined): T | null {
  const ref = useRef<T | null>(value ?? null);
  if (value !== null && value !== undefined) {
    ref.current = value;
  }
  return value ?? ref.current;
}

export interface KineticModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  triggerRef?: React.RefObject<HTMLElement | null>;
  originElement?: HTMLElement | null;
  maxWidthClass?: string;
  zIndexClass?: string;
  alignment?: 'center' | 'top';
  fullscreen?: boolean;
  closeOnScrimClick?: boolean;
  closeOnEscape?: boolean;
  role?: 'dialog' | 'alertdialog';
  ariaLabel?: string;
  ariaLabelledBy?: string;
  scrimClassName?: string;
  dialogClassName?: string;
  dir?: 'ltr' | 'rtl';
  dataTheme?: string;
  restoreFocusOnClose?: boolean;
  keepMounted?: boolean;
}

export const KineticModalShell: React.FC<KineticModalShellProps> = ({
  isOpen,
  onClose,
  children,
  triggerRef,
  originElement,
  maxWidthClass = 'max-w-lg',
  zIndexClass = 'z-[9990]',
  alignment = 'center',
  fullscreen = false,
  closeOnScrimClick = true,
  closeOnEscape = true,
  role = 'dialog',
  ariaLabel,
  ariaLabelledBy,
  scrimClassName = 'bg-black/50 dark:bg-black/68',
  dialogClassName = '',
  dir,
  dataTheme,
  restoreFocusOnClose = true,
  keepMounted = false,
}) => {
  const [shouldRender, setShouldRender] = useState<boolean>(isOpen);
  if (isOpen && !shouldRender) {
    setShouldRender(true);
  }

  const modalTokenRef = useRef<symbol>(Symbol('kinetic-modal'));
  const scrimRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const springRef = useRef<Sp | null>(null);
  const lifecycleRef = useRef<'closed' | 'opening' | 'open' | 'closing'>('closed');
  const openedAtRef = useRef<number>(0);
  const scrimMouseDownRef = useRef<boolean>(false);
  const openerElRef = useRef<HTMLElement | null>(null);
  const reducedTimerRef = useRef<number | null>(null);
  const hasLockedScrollRef = useRef<boolean>(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  if (!springRef.current) {
    springRef.current = new Sp(0, MODAL_SPRING_COEFFS);
  }

  const clearReducedTimer = useCallback(() => {
    if (reducedTimerRef.current !== null) {
      window.clearTimeout(reducedTimerRef.current);
      reducedTimerRef.current = null;
    }
  }, []);

  const finishClose = useCallback(() => {
    clearReducedTimer();
    const scrim = scrimRef.current;
    const dialog = dialogRef.current;
    const s = springRef.current;
    if (s) {
      s.t = 0;
      s.x = 0;
      s.v = 0;
    }
    if (scrim) {
      scrim.style.opacity = '0';
      scrim.style.pointerEvents = 'none';
      scrim.style.willChange = '';
      scrim.style.transition = '';
      if (keepMounted) {
        scrim.style.visibility = 'hidden';
      }
    }
    if (dialog) {
      dialog.style.willChange = '';
      dialog.style.transform = `scale3d(${KINETIC_MODAL_START_SCALE}, ${KINETIC_MODAL_START_SCALE}, 1)`;
    }
    lifecycleRef.current = 'closed';
    if (!keepMounted) {
      setShouldRender(false);
    }
  }, [clearReducedTimer, keepMounted]);

  // LIFO Escape + modal stack registration
  useEffect(() => {
    const token = modalTokenRef.current;
    if (!isOpen) {
      const idx = activeModalStack.indexOf(token);
      if (idx !== -1) activeModalStack.splice(idx, 1);
      return;
    }
    if (!activeModalStack.includes(token)) {
      activeModalStack.push(token);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!closeOnEscape || e.key !== 'Escape') return;
      if (activeModalStack[activeModalStack.length - 1] !== token) return;
      if (typeof document !== 'undefined' && document.querySelector('[data-atr-popover-open="true"]')) {
        return;
      }
      e.stopPropagation();
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      const idx = activeModalStack.indexOf(token);
      if (idx !== -1) activeModalStack.splice(idx, 1);
    };
  }, [isOpen, closeOnEscape]);

  // Cleanup scroll lock & spring on unmount
  useEffect(() => {
    return () => {
      clearReducedTimer();
      if (hasLockedScrollRef.current) {
        hasLockedScrollRef.current = false;
        releaseScrollLock();
      }
      springRef.current?.destroy();
      springRef.current = null;
    };
  }, [clearReducedTimer]);

  // Frame loop subscription (zero React renders per frame, full float precision)
  useEffect(() => {
    if (!shouldRender) return;

    const draw = () => {
      const st = lifecycleRef.current;
      if (st === 'closed' || checkReducedMotion()) return;
      const scrim = scrimRef.current;
      const dialog = dialogRef.current;
      const s = springRef.current;
      if (!scrim || !dialog || !s) return;
      if (st === 'open' && Math.abs(s.t - s.x) < KINETIC_MODAL_SETTLE_EPSILON && Math.abs(s.v) < KINETIC_MODAL_SETTLE_EPSILON) {
        return;
      }

      const metrics = computeKineticModalMetrics(s.x, false);
      scrim.style.opacity = metrics.opacity.toFixed(4);
      if (!fullscreen) {
        dialog.style.transform = `scale3d(${metrics.scale.toFixed(4)}, ${metrics.scale.toFixed(4)}, 1)`;
      }
    };

    const cleanup = () => {
      const st = lifecycleRef.current;
      if (st === 'closed' || checkReducedMotion()) return;
      const scrim = scrimRef.current;
      const dialog = dialogRef.current;
      const s = springRef.current;
      if (!scrim || !dialog || !s) return;

      const isSettledOpen =
        st === 'opening' &&
        s.t === 100 &&
        Math.abs(100 - s.x) < KINETIC_MODAL_SETTLE_EPSILON &&
        Math.abs(s.v) < KINETIC_MODAL_SETTLE_EPSILON;

      if (isSettledOpen) {
        s.snap();
        scrim.style.opacity = '1';
        scrim.style.willChange = '';
        dialog.style.transform = 'none';
        dialog.style.willChange = '';
        dialog.setAttribute('data-settled', 'true');
        lifecycleRef.current = 'open';
      } else if (st === 'closing' && shouldFinishModalClosing(s.x, s.t)) {
        finishClose();
      }
    };

    const unsubDraw = subscribeFrame(draw);
    const unsubClean = subscribeCleanup(cleanup);
    return () => {
      unsubDraw();
      unsubClean();
    };
  }, [shouldRender, fullscreen, finishClose]);

  // Open / Close lifecycle orchestration
  useLayoutEffect(() => {
    if (!shouldRender) return;
    const scrim = scrimRef.current;
    const dialog = dialogRef.current;
    const s = springRef.current;
    if (!scrim || !dialog || !s) return;

    if (isOpen) {
      const st = lifecycleRef.current;
      if (st === 'opening' || st === 'open') return;

      clearReducedTimer();
      const reduced = checkReducedMotion();
      if (!hasLockedScrollRef.current) {
        hasLockedScrollRef.current = true;
        acquireScrollLock();
      }

      const origin = resolveModalOrigin(triggerRef?.current ?? originElement ?? null);
      if (st === 'closed') {
        openerElRef.current = origin.element;
      }
      openedAtRef.current = performance.now();
      scrimMouseDownRef.current = false;

      scrim.style.visibility = 'visible';
      scrim.style.pointerEvents = 'auto';
      dialog.removeAttribute('data-settled');

      if (!fullscreen) {
        // Measure unscaled 1x layout box before applying start scale
        const prevTransform = dialog.style.transform;
        dialog.style.transform = 'none';
        const dRect = dialog.getBoundingClientRect();
        dialog.style.transformOrigin = computeKineticModalTransformOrigin(
          origin.rect,
          dRect,
          window.innerWidth,
          window.innerHeight
        );
        dialog.style.transform = prevTransform;
      } else {
        dialog.style.transformOrigin = 'center center';
      }

      if (reduced) {
        lifecycleRef.current = 'opening';
        scrim.style.willChange = 'opacity';
        scrim.style.transition = `opacity ${REDUCED_FADE_MS}ms linear`;
        scrim.style.opacity = st === 'closing' ? scrim.style.opacity : '0';
        dialog.style.transform = 'none';
        dialog.style.willChange = '';
        s.x = 100;
        s.v = 0;
        s.t = 100;
        requestAnimationFrame(() => {
          if (scrimRef.current) scrimRef.current.style.opacity = '1';
        });
        reducedTimerRef.current = window.setTimeout(() => {
          reducedTimerRef.current = null;
          if (lifecycleRef.current === 'opening') {
            if (scrimRef.current) {
              scrimRef.current.style.willChange = '';
              scrimRef.current.style.transition = '';
            }
            dialogRef.current?.setAttribute('data-settled', 'true');
            lifecycleRef.current = 'open';
          }
        }, REDUCED_FADE_MS);
      } else {
        lifecycleRef.current = 'opening';
        scrim.style.transition = '';
        scrim.style.willChange = 'opacity';
        dialog.style.willChange = fullscreen ? '' : 'transform';

        if (st === 'closed') {
          s.x = 0;
          s.v = 0;
          scrim.style.opacity = '0';
          dialog.style.transform = fullscreen
            ? 'none'
            : `scale3d(${KINETIC_MODAL_START_SCALE}, ${KINETIC_MODAL_START_SCALE}, 1)`;
        }
        s.setTarget(100);
        wake();
      }
    } else if (lifecycleRef.current === 'opening' || lifecycleRef.current === 'open') {
      clearReducedTimer();
      lifecycleRef.current = 'closing';
      scrim.style.pointerEvents = 'none';
      dialog.removeAttribute('data-settled');

      if (hasLockedScrollRef.current) {
        hasLockedScrollRef.current = false;
        releaseScrollLock();
      }

      if (restoreFocusOnClose && openerElRef.current && openerElRef.current.isConnected) {
        const cs = getComputedStyle(openerElRef.current);
        if (cs.visibility !== 'hidden' && cs.display !== 'none') {
          openerElRef.current.focus({ preventScroll: true });
        }
      }

      const reduced = checkReducedMotion();
      if (reduced) {
        scrim.style.willChange = 'opacity';
        scrim.style.transition = `opacity ${REDUCED_FADE_MS}ms linear`;
        scrim.style.opacity = '0';
        s.x = 0;
        s.v = 0;
        s.t = 0;
        reducedTimerRef.current = window.setTimeout(() => {
          reducedTimerRef.current = null;
          if (lifecycleRef.current === 'closing') {
            finishClose();
          }
        }, REDUCED_FADE_MS);
      } else {
        scrim.style.transition = '';
        scrim.style.willChange = 'opacity';
        dialog.style.willChange = fullscreen ? '' : 'transform';
        if (dialog.style.transform === 'none' && !fullscreen) {
          dialog.style.transform = 'scale3d(1, 1, 1)';
        }
        s.setTarget(0);
        wake();
      }
    }
  }, [
    isOpen,
    shouldRender,
    triggerRef,
    originElement,
    fullscreen,
    restoreFocusOnClose,
    clearReducedTimer,
    finishClose,
  ]);

  if (!shouldRender && !keepMounted) return null;

  const alignClasses = fullscreen
    ? ''
    : alignment === 'top'
    ? 'items-start justify-center pt-[var(--s8,48px)] sm:pt-[calc(var(--s8,48px)*2)] p-[var(--s4,16px)]'
    : 'items-center justify-center p-4';

  const node = (
    <div
      ref={scrimRef}
      data-kinetic-scrim="true"
      data-theme={dataTheme}
      dir={dir}
      className={`kinetic-modal-scrim fixed inset-0 ${zIndexClass} flex ${alignClasses} ${scrimClassName} select-none print:static print:bg-white print:p-0 print:opacity-100 print:z-auto`}
      style={{
        opacity: 0,
        pointerEvents: 'none',
        visibility: !shouldRender && keepMounted ? 'hidden' : 'visible',
      }}
      aria-hidden={!isOpen}
      onMouseDown={(e) => {
        scrimMouseDownRef.current = e.target === scrimRef.current;
      }}
      onMouseUp={(e) => {
        if (!closeOnScrimClick) {
          scrimMouseDownRef.current = false;
          return;
        }
        const onScrim = e.target === scrimRef.current;
        const ok =
          scrimMouseDownRef.current &&
          onScrim &&
          performance.now() - openedAtRef.current >= SCRIM_CLICK_GUARD_MS;
        scrimMouseDownRef.current = false;
        if (ok) onCloseRef.current();
      }}
    >
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        data-kinetic-modal-dialog="true"
        data-fullscreen={fullscreen ? 'true' : undefined}
        className={`kinetic-modal-dialog relative ${
          fullscreen ? 'w-full h-full' : `w-full ${maxWidthClass}`
        } select-text print:max-w-none print:transform-none print:shadow-none ${dialogClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(node, document.body) : node;
};
