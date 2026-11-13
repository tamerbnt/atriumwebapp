'use client';

import { useContext, useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { cx, useControllable, useIsoLayoutEffect } from '../../hooks';
import { initMotionEnv } from '../../motion/env';
import { SidebarBody, SidebarHoverBody, SidebarActiveBody } from './shellBodies';
import { ShellContext } from './AppShell';
import s from './Sidebar.module.css';

export interface SidebarItem {
  id: string;
  label: string;
  /** any inline SVG, e.g. a Lucide icon */
  icon: ReactNode;
  badge?: number;
}

export interface SidebarProps {
  items: SidebarItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  /** expanded? controlled */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** logo mark (shown in the rail) + name (shown when expanded) */
  brand?: { mark: ReactNode; title: string };
  /** optional custom brand click override (defaults to toggling the sidebar) */
  onBrandClick?: () => void;
  footer?: ReactNode;
  /** how it opens: the edge handle always works; 'hover' also opens on a mouse hover (with intent delay) */
  expandOn?: 'click' | 'hover';
  /** accessible name of the landmark */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/**
 * Collapsible navigation sidebar with kinetic spring physics.
 *
 * When expanded, it pushes the topbar and page content in synchronized lockstep.
 * Stays pinned open across all clicks until explicitly toggled via logo or edge button.
 * Incorporates a fluid direct-DOM magnetic hover pill with velocity stretch (0 React re-renders).
 */
export function Sidebar({
  items, activeId, onSelect, open: openProp, defaultOpen, onOpenChange, brand, onBrandClick, footer,
  expandOn = 'click', label = 'Main navigation', className, style,
}: SidebarProps) {
  const shellCtx = useContext(ShellContext);
  const [open, setOpen] = useControllable<boolean>(
    openProp ?? shellCtx?.sidebarOpen,
    defaultOpen ?? shellCtx?.sidebarOpen ?? false,
    (v) => {
      onOpenChange?.(v);
      shellCtx?.setSidebarOpen(v);
    }
  );
  const root = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const edge = useRef<HTMLButtonElement>(null);
  const magneticHlRef = useRef<HTMLSpanElement>(null);
  const activeBlobRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const body = useRef<SidebarBody | null>(null);
  const hoverBody = useRef<SidebarHoverBody | null>(null);
  const activeBody = useRef<SidebarActiveBody | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const activeIdx = items.findIndex((it) => it.id === activeId);
  const activeIdxRef = useRef(activeIdx);
  activeIdxRef.current = activeIdx;
  const itemsSig = items.map((it) => it.id).join('|');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useIsoLayoutEffect(() => {
    if (!root.current) return;
    initMotionEnv();
    const b = new SidebarBody(root.current, openRef.current);
    body.current = b;
    b.snap();
    b.render();

    if (magneticHlRef.current) {
      const hb = new SidebarHoverBody(magneticHlRef.current);
      hoverBody.current = hb;
      hb.snap();
    }

    return () => {
      clearTimeout(timer.current);
      b.dispose();
      hoverBody.current?.dispose();
      body.current = null;
      hoverBody.current = null;
    };
  }, []);

  useIsoLayoutEffect(() => {
    const list = listRef.current;
    const blob = activeBlobRef.current;
    if (!list || !blob) return;

    const opts = itemRefs.current.slice(0, items.length).filter(Boolean) as HTMLButtonElement[];
    const ab = new SidebarActiveBody(list, blob, opts);
    activeBody.current = ab;

    const sync = () => {
      ab.measure();
      if (ab.settled()) {
        ab.setIndex(activeIdxRef.current, false);
      }
    };

    ab.measure();
    ab.setIndex(activeIdxRef.current, false);
    list.setAttribute('data-live', 'true');

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(sync);
      ro.observe(list);
    }

    let alive = true;
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (alive) sync();
      });
    }

    return () => {
      alive = false;
      ro?.disconnect();
      ab.dispose();
      activeBody.current = null;
      list.removeAttribute('data-live');
    };
  }, [itemsSig]);

  useEffect(() => {
    activeBody.current?.setIndex(activeIdx, true);
  }, [activeIdx]);

  useIsoLayoutEffect(() => {
    body.current?.setOpen(open);
  }, [open]);

  // Keyboard accessibility: Escape folds it back to the rail.
  // Pinned persistence: outside clicks do NOT shrink the sidebar.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        if (root.current?.contains(document.activeElement)) edge.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);

  const intent = (v: boolean, ms: number) => (e: { pointerType?: string }) => {
    if (expandOn !== 'hover' || e.pointerType === 'touch') return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(v), ms);
  };

  const handleBrandClick = () => {
    if (onBrandClick) {
      onBrandClick();
    } else {
      setOpen(!open);
    }
  };

  const lastTargetBtn = useRef<HTMLButtonElement | null>(null);

  const handleListPointer = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const target = e.target as HTMLElement;
    const btn = target.closest('button');
    if (!btn || !listRef.current) return;
    if (btn === lastTargetBtn.current) return;
    lastTargetBtn.current = btn;
    hoverBody.current?.setHover([btn.offsetTop, btn.offsetHeight || 40]);
  };

  const onListPointerLeave = (e: React.PointerEvent) => {
    const related = e.relatedTarget as Node | null;
    if (listRef.current && related && listRef.current.contains(related)) return;
    lastTargetBtn.current = null;
    hoverBody.current?.setHover(null);
  };

  return (
    <nav
      ref={root}
      aria-label={label}
      data-open={open ? '' : undefined}
      className={cx(s.root, className)}
      style={style}
      onPointerEnter={intent(true, 180)}
      onPointerLeave={intent(false, 260)}
    >
      <div className={s.panel}>
        {brand ? (
          <div
            className={s.brand}
            role="button"
            tabIndex={0}
            onClick={handleBrandClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleBrandClick();
              }
            }}
            style={{ cursor: 'pointer' }}
            title={brand.title}
          >
            <span className={s.brandMark}>{brand.mark}</span>
            <span className={s.brandTitle} style={{ ['--i' as string]: 0 } as CSSProperties}>
              <span className={s.lab}>{brand.title}</span>
            </span>
          </div>
        ) : (
          <div className={s.brand} />
        )}
        <ul
          ref={listRef}
          className={s.list}
          onPointerOver={handleListPointer}
          onPointerMove={handleListPointer}
          onPointerLeave={onListPointerLeave}
        >
          <span ref={magneticHlRef} className={s.magneticHl} aria-hidden="true" />
          <span ref={activeBlobRef} className={s.activeBlob} aria-hidden="true" />
          {items.map((it, i) => (
            <li key={it.id}>
              <button
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                className={s.item}
                aria-current={it.id === activeId ? 'page' : undefined}
                aria-label={it.label}
                title={open ? undefined : it.label}
                style={{ ['--i' as string]: i + 1 } as CSSProperties}
                onClick={() => onSelect?.(it.id)}
              >
                <span className={s.ico}>{it.icon}</span>
                <span className={s.lab} aria-hidden="true">{it.label}</span>
                {it.badge ? <span className={s.badge}>{it.badge}</span> : null}
              </button>
            </li>
          ))}
        </ul>
        {footer ? <div className={s.footer}>{footer}</div> : null}
      </div>
      <button
        ref={edge}
        type="button"
        className={s.edge}
        aria-expanded={open}
        aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        onClick={() => setOpen(!open)}
      >
        <Chevron />
      </button>
    </nav>
  );
}
