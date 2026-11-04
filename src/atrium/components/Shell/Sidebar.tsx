'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { cx, useControllable, useIsoLayoutEffect } from '../../hooks';
import { initMotionEnv } from '../../motion/env';
import { SidebarBody } from './shellBodies';
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
  /** callback when clicking brand logo */
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
 * Collapsible navigation sidebar. A rail takes the layout space; expanding draws a panel over the
 * page, driven by one spring and one CSS variable, so it never reflows the page and costs nothing
 * at rest. Escape and a click outside close it. Place it as the `sidebar` of <AppShell>.
 */
export function Sidebar({
  items, activeId, onSelect, open: openProp, defaultOpen, onOpenChange, brand, onBrandClick, footer,
  expandOn = 'click', label = 'Main navigation', className, style,
}: SidebarProps) {
  const [open, setOpen] = useControllable<boolean>(openProp, defaultOpen ?? false, onOpenChange);
  const root = useRef<HTMLElement>(null);
  const edge = useRef<HTMLButtonElement>(null);
  const body = useRef<SidebarBody | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useIsoLayoutEffect(() => {
    if (!root.current) return;
    initMotionEnv();
    const b = new SidebarBody(root.current, openRef.current);
    body.current = b;
    b.snap();
    b.render();
    return () => {
      clearTimeout(timer.current);
      b.dispose();
      body.current = null;
    };
  }, []);

  useEffect(() => {
    body.current?.setOpen(open);
  }, [open]);

  // while expanded: Escape and a click outside fold it back to the rail
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        if (root.current?.contains(document.activeElement)) edge.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [open, setOpen]);

  const intent = (v: boolean, ms: number) => (e: { pointerType?: string }) => {
    if (expandOn !== 'hover' || e.pointerType === 'touch') return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(v), ms);
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
            onClick={() => {
              if (onBrandClick) onBrandClick();
              else setOpen(!open);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (onBrandClick) onBrandClick();
                else setOpen(!open);
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
        <ul className={s.list}>
          {items.map((it, i) => (
            <li key={it.id}>
              <button
                type="button"
                className={s.item}
                aria-current={it.id === activeId ? 'page' : undefined}
                aria-label={it.label}
                title={open ? undefined : it.label}
                style={{ ['--i' as string]: i + 1 } as CSSProperties}
                onClick={() => onSelect?.(it.id)}
              >
                <span className={s.hl} />
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
