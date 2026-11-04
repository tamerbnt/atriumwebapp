'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { cx, useControllable, useIsoLayoutEffect } from '../../hooks';
import { initMotionEnv } from '../../motion/env';
import { BarBody } from './shellBodies';
import s from './AppShell.module.css';

export interface AppShellProps {
  /** a <Sidebar />. It takes the rail's width; its expanded panel overlays the page. */
  sidebar: ReactNode;
  /** the content of the top bar (breadcrumbs, filters, icon buttons…) */
  topbar: ReactNode;
  /** the page. It is the shell's scroll container (a rounded card). */
  children: ReactNode;
  /** top bar hidden? controlled */
  barHidden?: boolean;
  defaultBarHidden?: boolean;
  onBarHiddenChange?: (hidden: boolean) => void;
  /** hide on scroll down, show on scroll up (default true) */
  autoHide?: boolean;
  /** the page's scroll element, for apps that need to scroll it themselves */
  scrollRef?: RefObject<HTMLElement>;
  className?: string;
  style?: CSSProperties;
  /** accessible name for the page region */
  mainLabel?: string;
}

const HIDE_AFTER = 48; // px scrolled down before the bar goes
const SHOW_AFTER = 24; // px scrolled up before it comes back
const COOLDOWN = 520; // ms after a move before the next one (the layout settles, no ping-pong)

/**
 * The app frame: sidebar rail, top bar, page card.
 *
 * The top bar can leave and return. Hiding it gives its space to the page: the layout changes once
 * and a spring-driven transform on the bar and the card carries the move, so there is no layout work
 * per frame. Scrolling down hides it, scrolling up (or a hover on the top edge, or focus, or the
 * "Show top bar" button for keyboard users) brings it back.
 */
export function AppShell({
  sidebar, topbar, children, barHidden: hiddenProp, defaultBarHidden, onBarHiddenChange,
  autoHide = true, scrollRef, className, style, mainLabel = 'Page',
}: AppShellProps) {
  const [hidden, setHidden] = useControllable<boolean>(hiddenProp, defaultBarHidden ?? false, onBarHiddenChange);
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  const body = useRef<BarBody | null>(null);
  const hiddenRef = useRef(hidden);
  const queued = useRef<boolean | null>(null);
  const lastMove = useRef(0);

  // request a change; if the bar is still travelling, apply it when it lands
  const request = useCallback(
    (v: boolean) => {
      if (v === hiddenRef.current) {
        queued.current = null;
        return;
      }
      const b = body.current;
      if (b && b.moving) {
        queued.current = v;
        return;
      }
      queued.current = null;
      lastMove.current = performance.now();
      setHidden(v);
    },
    [setHidden],
  );

  useIsoLayoutEffect(() => {
    if (!root.current || !bar.current || !main.current) return;
    initMotionEnv();
    if (scrollRef) (scrollRef as { current: HTMLElement | null }).current = main.current;
    const b = new BarBody(bar.current, main.current, root.current, hiddenRef.current);
    body.current = b;
    const measure = () => {
      const gap = parseFloat(getComputedStyle(root.current as Element).columnGap) || 12;
      b.H = (bar.current as HTMLElement).offsetHeight + gap;
      b.snap();
      b.render();
      b.onSleep();
    };
    measure();
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(bar.current);
    }
    return () => {
      ro?.disconnect();
      b.dispose();
      body.current = null;
    };
  }, []);

  // The layout flips in this commit; the body starts its transform in the same layout phase,
  // before paint, so the card never shows the jump.
  useIsoLayoutEffect(() => {
    if (hiddenRef.current === hidden) return;
    hiddenRef.current = hidden;
    const b = body.current;
    if (!b) return;
    // keep the card where it was for this frame, then let the spring carry it
    b.setHidden(hidden);
    b.render();
  }, [hidden]);

  // a queued request goes out as soon as the bar has landed
  useEffect(() => {
    const t = setInterval(() => {
      if (queued.current !== null && body.current && !body.current.moving) {
        const v = queued.current;
        queued.current = null;
        if (v !== hiddenRef.current) {
          lastMove.current = performance.now();
          setHidden(v);
        }
      }
    }, 120);
    return () => clearInterval(t);
  }, [setHidden]);

  // scroll direction → hide / show
  useEffect(() => {
    const el = main.current;
    if (!el || !autoHide) return;
    let last = el.scrollTop;
    let acc = 0;
    const onScroll = () => {
      const top = el.scrollTop;
      const d = top - last;
      last = top;
      if (performance.now() - lastMove.current < COOLDOWN) {
        acc = 0;
        return;
      }
      if (top < 8) {
        acc = 0;
        request(false);
        return;
      }
      acc = Math.sign(d) === Math.sign(acc) ? acc + d : d;
      if (acc > HIDE_AFTER) {
        acc = 0;
        request(true);
      } else if (acc < -SHOW_AFTER) {
        acc = 0;
        request(false);
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [autoHide, request]);

  // a mouse resting on the top edge brings the bar back
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || !hiddenRef.current) return;
      const edge = e.clientY - el.getBoundingClientRect().top < 6;
      if (edge && !t) t = setTimeout(() => { t = undefined; request(false); }, 140);
      else if (!edge && t) { clearTimeout(t); t = undefined; }
    };
    el.addEventListener('pointermove', move, { passive: true });
    return () => { el.removeEventListener('pointermove', move); clearTimeout(t); };
  }, [request]);

  // keyboard focus inside the bar always shows it
  const onBarFocus = () => request(false);

  return (
    <div
      ref={root}
      className={cx(s.root, className)}
      style={style}
      data-bar={hidden ? 'hidden' : 'shown'}
    >
      <div className={s.side}>{sidebar}</div>
      <div className={s.slot}>
        <div ref={bar} className={s.bar} onFocusCapture={onBarFocus}>
          {topbar}
        </div>
      </div>
      {hidden ? (
        <button type="button" className={s.reveal} onClick={() => request(false)}>
          Show top bar
        </button>
      ) : null}
      <main ref={main} className={s.main} aria-label={mainLabel} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
