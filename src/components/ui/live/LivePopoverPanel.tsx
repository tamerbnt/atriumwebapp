import React, { useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PopoverMenuController, calculatePopoverPlacement } from '../../../utils/atriumSprings';

export const popoverClasses = {
  panel: 'i',
  hl: 'q',
  header: 'n',
  hr: 'j',
  item: 'r',
  text: 'T',
  danger: 'C',
  mark: 'H',
};

export interface LivePopoverPanelProps {
  id?: string;
  anchor: HTMLElement | null;
  open: boolean;
  role?: string;
  focus?: 'first' | 'selected' | null;
  onRequestClose: (reason?: string) => void;
  onClosed?: () => void;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  width?: 'menu' | 'anchor';
  header?: React.ReactNode;
  children: React.ReactNode;
  'aria-label'?: string;
}

export function LivePopoverPanel({
  id,
  anchor,
  open,
  role = 'menu',
  focus = 'first',
  onRequestClose,
  onClosed,
  placement = 'bottom-end',
  width = 'menu',
  header,
  children,
  'aria-label': ariaLabel,
}: LivePopoverPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const hlRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<PopoverMenuController | null>(null);
  const closeRef = useRef(onRequestClose);
  closeRef.current = onRequestClose;
  const closedRef = useRef(onClosed);
  closedRef.current = onClosed;

  const updatePosition = useCallback(() => {
    const panel = panelRef.current;
    const ctrl = controllerRef.current;
    if (!panel || !anchor || !ctrl) return;

    const anchorRect = anchor.getBoundingClientRect();
    if (width === 'anchor') {
      panel.style.width = `${Math.round(anchorRect.width)}px`;
    }

    const docEl = anchor.ownerDocument.documentElement;
    const pos = calculatePopoverPlacement(
      anchorRect,
      panel.offsetWidth,
      panel.offsetHeight,
      placement,
      6,
      { width: docEl.clientWidth, height: docEl.clientHeight }
    );

    panel.style.top = `${Math.round(pos.top)}px`;
    panel.style.left = `${Math.round(pos.left)}px`;
    panel.setAttribute('data-side', pos.side);
    ctrl.side = pos.side;
  }, [anchor, placement, width]);

  // Setup PopoverMenuController
  useEffect(() => {
    const panel = panelRef.current;
    const hl = hlRef.current;
    if (!panel || !hl || !anchor) return;

    const chev = anchor.querySelector<HTMLElement>('[data-atr-chev]');
    const ctrl = new PopoverMenuController(panel, hl, chev, () => {
      closedRef.current?.();
    });
    controllerRef.current = ctrl;

    updatePosition();
    ctrl.measure();
    ctrl.render();

    if (open) {
      ctrl.setOpen(true);
    }

    return () => {
      ctrl.dispose();
      controllerRef.current = null;
      if (chev) chev.style.transform = '';
    };
  }, [anchor, updatePosition]);

  // Handle open state transition
  useEffect(() => {
    const ctrl = controllerRef.current;
    const panel = panelRef.current;
    if (!ctrl || !panel) return;

    if (open) {
      updatePosition();
      ctrl.setOpen(true);

      // Focus management
      requestAnimationFrame(() => {
        const items = Array.from(
          panel.querySelectorAll<HTMLButtonElement>('[data-atr-item]:not([disabled])')
        );
        if (items.length > 0) {
          const target =
            focus === 'selected'
              ? items.find((el) => el.getAttribute('aria-selected') === 'true') || items[0]
              : items[0];
          target?.focus({ preventScroll: true });
        }
      });
    } else {
      ctrl.setOpen(false);
    }
  }, [open, updatePosition, focus]);

  // Global listeners for outside click, resize, scroll, and escape
  useEffect(() => {
    if (!open || !anchor) return;

    const onPointerDown = (e: PointerEvent) => {
      const panel = panelRef.current;
      const target = e.target as Node | null;
      if (!target) return;
      if (panel && (panel.contains(target) || panel === target)) return;
      if (anchor.contains(target) || anchor === target) return;
      closeRef.current?.('outside');
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current?.('escape');
        anchor.focus?.();
        return;
      }

      const panel = panelRef.current;
      if (!panel) return;

      const items = Array.from(
        panel.querySelectorAll<HTMLButtonElement>('[data-atr-item]:not([disabled])')
      );
      if (items.length === 0) return;

      const active = document.activeElement as HTMLButtonElement | null;
      const activeIdx = items.indexOf(active!);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = activeIdx >= 0 && activeIdx < items.length - 1 ? activeIdx + 1 : 0;
        items[next]?.focus({ preventScroll: true });
        controllerRef.current?.setHover(items[next]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = activeIdx > 0 ? activeIdx - 1 : items.length - 1;
        items[prev]?.focus({ preventScroll: true });
        controllerRef.current?.setHover(items[prev]);
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0]?.focus({ preventScroll: true });
        controllerRef.current?.setHover(items[0]);
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1]?.focus({ preventScroll: true });
        controllerRef.current?.setHover(items[items.length - 1]);
      }
    };

    const onReposition = () => updatePosition();

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onReposition, { passive: true });
    window.addEventListener('scroll', onReposition, { passive: true, capture: true });

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, anchor, updatePosition]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role={role}
      aria-label={ariaLabel}
      className={popoverClasses.panel}
      tabIndex={-1}
      onPointerMove={(e) => {
        const item = (e.target as HTMLElement)?.closest<HTMLElement>('[data-atr-item]:not([disabled])');
        controllerRef.current?.setHover(item || null);
      }}
      onPointerLeave={() => {
        controllerRef.current?.setHover(null);
      }}
    >
      <div ref={hlRef} className={popoverClasses.hl} aria-hidden="true" />
      {header && <div className={popoverClasses.header}>{header}</div>}
      {header && <div className={popoverClasses.hr} />}
      {children}
    </div>,
    document.body
  );
}
