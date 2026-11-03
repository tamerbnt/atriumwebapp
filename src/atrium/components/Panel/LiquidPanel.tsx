'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode, FocusEvent, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useIsoLayoutEffect, useControllable } from '../../hooks';
import { PanelBody } from './panelBody';
import { computePosition } from './position';
import type { Placement } from './position';
import s from './Panel.module.css';

export type CloseReason = 'escape' | 'outside' | 'tab' | 'select' | 'toggle';
type FocusTarget = 'first' | 'last' | 'selected' | 'none';

/* ------------------------------------------------------------------ usePopup */

export interface PopupOptions {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  haspopup: 'menu' | 'listbox';
}

/**
 * State and trigger wiring shared by Menu and Select.
 * `getTriggerProps()` returns everything the trigger button needs: ref, aria, click and arrow keys.
 */
export function usePopup({ open: openProp, defaultOpen, onOpenChange, haspopup }: PopupOptions) {
  const [open, setOpen] = useControllable<boolean>(openProp, defaultOpen ?? false, onOpenChange);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // the panel stays mounted while it drains, so closing is as physical as opening
  const [draining, setDraining] = useState(false);
  const id = useId();
  const via = useRef<FocusTarget>('none');
  const openRef = useRef(open);
  openRef.current = open;
  // keyboard opens a menu on its first row, a listbox on the selected one
  const kbTarget: FocusTarget = haspopup === 'listbox' ? 'selected' : 'first';

  useEffect(() => {
    if (open) setDraining(true);
  }, [open]);

  const requestClose = useCallback(
    (reason: CloseReason) => {
      setOpen(false);
      // give focus back to the trigger, except when the user clicked somewhere else on purpose
      if (reason !== 'outside') anchor?.focus({ preventScroll: true });
    },
    [setOpen, anchor],
  );

  const getTriggerProps = () => ({
    ref: setAnchor as (el: HTMLElement | null) => void,
    'aria-haspopup': haspopup,
    'aria-expanded': open,
    'aria-controls': open ? id : undefined,
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (e.defaultPrevented) return;
      via.current = e.detail === 0 ? kbTarget : 'none'; // detail 0 = keyboard / programmatic
      setOpen(!openRef.current);
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.defaultPrevented) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const target: FocusTarget = e.key === 'ArrowUp' && haspopup === 'menu' ? 'last' : kbTarget;
        via.current = target;
        // already open (e.g. opened with the mouse): move focus into the panel
        if (openRef.current) focusItem(document.getElementById(id), target);
        else setOpen(true);
      }
    },
  });

  return {
    open,
    show: open || draining,
    anchor,
    getTriggerProps,
    panelProps: {
      id,
      anchor,
      open,
      role: haspopup,
      focus: via,
      onRequestClose: requestClose,
      onClosed: () => {
        if (!openRef.current) setDraining(false);
      },
    },
  };
}

/* ------------------------------------------------------------------ LiquidPanel */

export interface LiquidPanelProps {
  id: string;
  anchor: HTMLElement | null;
  open: boolean;
  role: 'menu' | 'listbox';
  /** where focus goes when the panel opens. Passed as a ref so the trigger can set it just before opening */
  focus: { current: FocusTarget };
  onRequestClose: (reason: CloseReason) => void;
  onClosed: () => void;
  'aria-label'?: string;
  placement?: Placement;
  /** 'anchor': at least as wide as the trigger (Select). 'menu' (default): a fixed 8.6 × height */
  width?: 'anchor' | 'menu';
  header?: ReactNode;
  children: ReactNode;
}

const GAP = 6;

function readContext(anchor: HTMLElement) {
  const themed = anchor.closest('[data-atrium-theme]');
  const theme = themed ? themed.getAttribute('data-atrium-theme') || undefined : undefined;
  const h = getComputedStyle(anchor).getPropertyValue('--atr-h').trim();
  return { theme, h };
}

export function LiquidPanel(props: LiquidPanelProps) {
  const { id, anchor, open, role, focus, onRequestClose, onClosed, placement = 'bottom-end', width = 'menu', header, children } = props;
  const panelRef = useRef<HTMLDivElement>(null);
  const hlRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<PanelBody | null>(null);
  const closeRef = useRef(onRequestClose);
  closeRef.current = onRequestClose;
  const closedRef = useRef(onClosed);
  closedRef.current = onClosed;
  const openRef = useRef(open);
  openRef.current = open;

  // the panel lives in <body>, so it carries the theme and size of the control that opened it
  const ctx = useMemo(() => (anchor ? readContext(anchor) : null), [anchor]);

  const place = useCallback(() => {
    const panel = panelRef.current;
    const body = bodyRef.current;
    if (!panel || !anchor || !body) return;
    const r = anchor.getBoundingClientRect();
    if (width === 'anchor') panel.style.width = `${Math.round(r.width)}px`;
    // use the anchor's own document, so it also works inside an iframe
    const root = anchor.ownerDocument.documentElement;
    const pos = computePosition(r, panel.offsetWidth, panel.offsetHeight, placement, GAP, {
      width: root.clientWidth,
      height: root.clientHeight,
    });
    panel.style.top = `${Math.round(pos.top)}px`;
    panel.style.left = `${Math.round(pos.left)}px`;
    panel.setAttribute('data-side', pos.side);
    body.side = pos.side;
  }, [anchor, placement, width]);

  // build the physics once the DOM exists
  useIsoLayoutEffect(() => {
    const panel = panelRef.current;
    const hl = hlRef.current;
    if (!panel || !hl || !anchor) return;
    const chev = anchor.querySelector<HTMLElement>('[data-atr-chev]');
    const body = new PanelBody(panel, hl, chev, () => closedRef.current());
    bodyRef.current = body;
    place();
    body.measure();
    body.render(); // hidden, fully clipped
    if (openRef.current) body.setOpen(true);
    return () => {
      body.dispose();
      bodyRef.current = null;
      if (chev) chev.style.transform = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  // open / close
  useIsoLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    if (open) {
      place();
      body.setOpen(true);
      focusItem(panelRef.current, focus.current);
    } else {
      body.setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // while open: follow the trigger on scroll / resize, and close on an outside press
  useEffect(() => {
    if (!open || !anchor) return;
    let queued = false;
    const reposition = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        place();
      });
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (t && (panelRef.current?.contains(t) || anchor.contains(t))) return;
      closeRef.current('outside');
    };
    // Escape works wherever focus is (e.g. still on the trigger after a mouse click)
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current('escape');
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, anchor, place]);

  /* hover blob: follows the pointer and keyboard focus */
  const rowOf = (t: EventTarget | null): HTMLElement | null => {
    const el = t as HTMLElement | null;
    const row = el && typeof el.closest === 'function' ? (el.closest('[data-atr-item]') as HTMLElement | null) : null;
    return row && !(row as HTMLButtonElement).disabled ? row : null;
  };
  const track = (row: HTMLElement | null) => bodyRef.current?.setHover(row ? [row.offsetTop, row.offsetHeight] : null);
  const onPointerOver = (e: ReactPointerEvent<HTMLDivElement>) => track(rowOf(e.target));
  const onPointerLeave = () => track(null);
  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const row = rowOf(e.target);
    if (row) track(row);
  };

  // type-ahead buffer
  const typed = useRef({ text: '', at: 0 });

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = enabledItems(panelRef.current);
    const i = items.indexOf(document.activeElement as HTMLElement);
    const n = items.length;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (n) items[i < 0 ? 0 : (i + 1) % n].focus({ preventScroll: false });
        return;
      case 'ArrowUp':
        e.preventDefault();
        if (n) items[i < 0 ? n - 1 : (i + n - 1) % n].focus({ preventScroll: false });
        return;
      case 'Home':
        e.preventDefault();
        items[0]?.focus();
        return;
      case 'End':
        e.preventDefault();
        items[n - 1]?.focus();
        return;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        closeRef.current('escape');
        return;
      case 'Tab':
        e.preventDefault();
        closeRef.current('tab');
        return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') {
      const now = Date.now();
      const t = typed.current;
      t.text = now - t.at > 600 ? e.key.toLowerCase() : t.text + e.key.toLowerCase();
      t.at = now;
      const hit = items.find((el) => (el.textContent || '').trim().toLowerCase().startsWith(t.text));
      if (hit) {
        e.preventDefault();
        hit.focus();
      }
    }
  };

  if (typeof document === 'undefined' || !anchor || !ctx) return null;

  const style = ctx.h ? ({ ['--atr-h' as string]: ctx.h } as CSSProperties) : undefined;
  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role={role}
      aria-label={props['aria-label']}
      tabIndex={-1}
      className={s.panel}
      data-atrium-theme={ctx.theme}
      data-side="down"
      style={style}
      onPointerOver={onPointerOver}
      onPointerLeave={onPointerLeave}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    >
      <span ref={hlRef} className={s.hl} aria-hidden="true" />
      {header ? <div className={s.header}>{header}</div> : null}
      {children}
    </div>,
    anchor.ownerDocument.body,
  );
}

function enabledItems(panel: HTMLElement | null): HTMLElement[] {
  return panel ? Array.from(panel.querySelectorAll<HTMLElement>('[data-atr-item]:not(:disabled)')) : [];
}

function focusItem(panel: HTMLElement | null, target: FocusTarget): void {
  const items = enabledItems(panel);
  if (target === 'none' || !items.length) return;
  const el =
    target === 'last'
      ? items[items.length - 1]
      : target === 'selected'
        ? items.find((i) => i.getAttribute('aria-selected') === 'true') || items[0]
        : items[0];
  el.focus({ preventScroll: true });
}

export { s as panelStyles };
