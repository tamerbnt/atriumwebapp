import React, { createContext, useContext, useLayoutEffect, useRef } from 'react';
import {
  Spring,
  ZETA,
  type Body,
  wake,
  unschedule,
  motion,
  installLiquid,
  kickScale,
  f,
} from '../../../atrium/motion';

const InsideKineticEmptyMotionContext = createContext(false);

export interface KineticEmptyStateMotionProps {
  children: React.ReactNode;
  /** Change key (e.g. tone + title + query) to replay subtle spring settle on state switch */
  motionKey?: string;
  className?: string;
  /** Optional explicit disabled state for static contexts */
  disabled?: boolean;
}

function attachLiquidOverlays(host: HTMLElement): void {
  const buttons = host.querySelectorAll<HTMLElement>('.es-btn');
  buttons.forEach((btn) => {
    if (!btn.hasAttribute('data-atr-liquid')) {
      btn.setAttribute('data-atr-liquid', '');
    }
    if (!btn.querySelector(':scope > [data-atr-lq]')) {
      const lq = document.createElement('span');
      lq.className = 'es-atr-lq';
      lq.setAttribute('data-atr-lq', '');
      lq.setAttribute('aria-hidden', 'true');
      btn.insertBefore(lq, btn.firstChild);
    }
  });
}

/**
 * Connects standalone dependency-free <EmptyState /> instances across Atrium
 * to Atrium's shared Spring Loop + Liquid Button physics engine:
 * - Zero per-frame React state updates (direct DOM transform/opacity writes)
 * - GPU-only compositor properties (`translate3d`, `scale`, `opacity`)
 * - Automatic `will-change` teardown on sleep
 * - Instant snap when `prefers-reduced-motion: reduce` or motion tier is `off`
 */
export const KineticEmptyStateMotion: React.FC<KineticEmptyStateMotionProps> = React.memo(
  ({ children, motionKey = 'default', className = '', disabled = false }) => {
    const isNested = useContext(InsideKineticEmptyMotionContext);
    const hostRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
      if (isNested || disabled || typeof window === 'undefined') return;
      const host = hostRef.current;
      if (!host) return;

      installLiquid();
      attachLiquidOverlays(host);

      const vessel =
        host.querySelector<HTMLElement>('.es-island') ??
        host.querySelector<HTMLElement>('.es-compact');
      if (!vessel) return;

      const tile = vessel.querySelector<HTMLElement>('.es-tile');

      if (motion.instant) {
        vessel.style.transform = '';
        vessel.style.opacity = '';
        vessel.style.willChange = '';
        return;
      }

      const y = new Spring(14, 280, ZETA);
      y.t = 0;
      const s = new Spring(0.965, 320, ZETA);
      s.t = 1;
      const o = new Spring(0, 240, 1);
      o.t = 1;

      let lastTf = '';
      let lastOp = '';

      const body: Body = {
        step(dt: number) {
          y.step(dt);
          s.step(dt);
          o.step(dt);
        },
        render() {
          const op = f(Math.max(0, Math.min(1, o.x)));
          if (op !== lastOp) {
            vessel.style.opacity = op;
            lastOp = op;
          }
          const tf = `translate3d(0,${f(y.x)}px,0) scale(${f(s.x)})`;
          if (tf !== lastTf) {
            vessel.style.transform = tf;
            lastTf = tf;
          }
        },
        settled() {
          return y.calm(0.1, 0.2) && s.calm(0.002, 0.01) && o.calm(0.005, 0.02);
        },
        snap() {
          y.snap();
          s.snap();
          o.snap();
        },
        onWake() {
          vessel.style.willChange = 'transform, opacity';
        },
        onSleep() {
          vessel.style.willChange = '';
          vessel.style.transform = '';
          vessel.style.opacity = '';
        },
        isVisible() {
          return vessel.isConnected;
        },
      };

      // Paint initial pre-entrance frame synchronously before browser paint
      body.render();
      wake(body);

      if (tile && vessel.querySelector('.es-dot')) {
        kickScale(tile, 8);
      }

      return () => {
        unschedule(body);
        vessel.style.willChange = '';
        vessel.style.transform = '';
        vessel.style.opacity = '';
      };
    }, [isNested, disabled, motionKey]);

    if (isNested) {
      return <>{children}</>;
    }

    return (
      <InsideKineticEmptyMotionContext.Provider value={true}>
        <div
          ref={hostRef}
          className={`es-motion-host w-full h-full flex flex-col min-w-0 ${className}`.trim()}
        >
          {children}
        </div>
      </InsideKineticEmptyMotionContext.Provider>
    );
  }
);

KineticEmptyStateMotion.displayName = 'KineticEmptyStateMotion';
