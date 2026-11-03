'use client';

import { forwardRef, useCallback, useEffect, useId, useRef } from 'react';
import type { ButtonHTMLAttributes, MouseEvent, PointerEvent } from 'react';
import { cx, sizeProps, useIsoLayoutEffect, useMergedRef } from '../../hooks';
import type { Size } from '../../hooks';
import { initMotionEnv } from '../../motion/env';
import { LiquidButtonBody, H } from './liquidButtonBody';
import type { LiquidKind, LiquidStatus, LbEls } from './liquidButtonBody';
import s from './LiquidButton.module.css';

export type { LiquidKind, LiquidStatus };

export interface LiquidLabels {
  idle?: string;
  busy?: string;
  done?: string;
  error?: string;
}

const DEFAULTS: Record<LiquidKind, Required<LiquidLabels> & { aria: string }> = {
  scan: { idle: 'Scan', busy: 'Scanning', done: 'Scanned', error: 'Scan failed', aria: 'Scan' },
  import: { idle: 'Import', busy: 'Importing', done: 'Imported', error: 'Import failed', aria: 'Import' },
  export: { idle: 'Export', busy: 'Exporting', done: 'Exported', error: 'Export failed', aria: 'Export' },
  confirm: { idle: 'Confirm', busy: 'Confirming', done: 'Confirmed', error: 'Failed', aria: 'Confirm' },
  continue: { idle: 'Continue', busy: 'Continue', done: 'Continue', error: 'Try again', aria: 'Continue' },
  create: { idle: 'Create', busy: 'Creating', done: 'Created', error: 'Failed', aria: 'Create' },
};

export interface LiquidButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick' | 'type'> {
  kind: LiquidKind;
  /**
   * Controlled state: 'idle' | 'busy' | 'done' | 'error'. Map it from your mutation, e.g.
   * React Query `isPending ? 'busy' : isSuccess ? 'done' : isError ? 'error' : 'idle'`.
   * Leave undefined to let the button run itself from `onPress`.
   */
  status?: LiquidStatus;
  /** 0..1 real progress for import / export. Without it the button paces itself. */
  progress?: number;
  /**
   * Called on press (when idle). Return a promise and the button stays busy until it settles
   * (resolve → done, reject → error). Return nothing and it plays its own short run.
   */
  onPress?: (e: MouseEvent<HTMLButtonElement>) => void | Promise<unknown>;
  /** Called when the button is pressed while busy. Provide it to make a busy press cancel the run. */
  onCancel?: () => void;
  /** Texts per state. Percent is appended to import / export while busy unless showPercent is false. */
  labels?: LiquidLabels;
  showPercent?: boolean;
  /** upper-case the labels (default true, matches the brand sheets) */
  uppercase?: boolean;
  /** accent: brand orange body, cream liquid · ink: dark body (cream in dark theme) */
  tone?: 'accent' | 'ink';
  size?: Size;
  /** the corners twitch now and then while idle; costs a few frames each time, nothing in between */
  alive?: boolean;
  /** ms to stay in done / error before returning to idle (Infinity or 0: stay until `status` changes) */
  holdMs?: number;
  type?: 'button' | 'submit' | 'reset';
}

const isPromise = (v: unknown): v is Promise<unknown> => !!v && typeof (v as Promise<unknown>).then === 'function';

/**
 * Liquid showpiece button: Scan, Import, Export, Confirm, Continue, Create.
 *
 * A real <button>: keyboard, focus ring, forms and disabled behave natively. The drawing is
 * aria-hidden; state is announced through a polite live region. The physics run on the shared loop,
 * so an idle button costs nothing, and reduced motion / the `off` tier replace the choreography
 * with a plain level + label change.
 */
export const LiquidButton = forwardRef<HTMLButtonElement, LiquidButtonProps>(function LiquidButton(
  {
    kind, status, progress, onPress, onCancel, labels, showPercent = true, uppercase = true, tone = 'accent',
    size, alive, holdMs, className, style, disabled, type = 'button', 'aria-label': ariaLabel, ...rest
  },
  ref,
) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ids = { clip: `${uid}c`, lqc: `${uid}l`, ct: `${uid}t`, fade: `${uid}f`, mask: `${uid}m` };
  const btnRef = useRef<HTMLButtonElement>(null);
  const merged = useMergedRef<HTMLButtonElement>(ref, btnRef);
  const bodyRef = useRef<LiquidButtonBody | null>(null);
  const liveRef = useRef<HTMLSpanElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<SVGGElement>(null);
  const bodyEl = useRef<SVGRectElement>(null);
  const clipr = useRef<SVGRectElement>(null);
  const maskr = useRef<SVGRectElement>(null);
  const liq = useRef<SVGPathElement>(null);
  const lqcp = useRef<SVGPathElement>(null);
  const air = useRef<SVGPathElement>(null);
  const mark = useRef<SVGPathElement>(null);
  const chk = useRef<SVGPathElement>(null);
  const arw = useRef<SVGPathElement>(null);
  const labRefs = useRef<Array<SVGGElement | null>>([]);
  const txtRefs = useRef<Array<SVGTextElement | null>>([]);
  const mounted = useRef(true);
  const statusRef = useRef<LiquidStatus>('idle');
  const rect = useRef<DOMRect | null>(null);

  const d = DEFAULTS[kind];
  const up = (t: string) => (uppercase ? t.toLocaleUpperCase() : t);
  const texts = {
    idle: up(labels?.idle ?? d.idle),
    busy: up(labels?.busy ?? d.busy),
    done: up(labels?.done ?? d.done),
    error: up(labels?.error ?? d.error),
  };
  const textKey = JSON.stringify([texts, showPercent]);
  const announce = useRef({ done: texts.done, error: texts.error });
  announce.current = { done: texts.done, error: texts.error };

  // build the body once
  useIsoLayoutEffect(() => {
    const els: LbEls | null =
      btnRef.current && svgRef.current && rootRef.current && bodyEl.current && clipr.current && maskr.current &&
      liq.current && lqcp.current && air.current && mark.current && chk.current && arw.current
        ? {
            button: btnRef.current, svg: svgRef.current, root: rootRef.current, body: bodyEl.current,
            clipr: clipr.current, maskr: maskr.current, liq: liq.current, lqcp: lqcp.current, air: air.current,
            mark: mark.current, chk: chk.current, arw: arw.current,
            labs: labRefs.current as SVGGElement[], texts: txtRefs.current as SVGTextElement[],
          }
        : null;
    if (!els) return;
    initMotionEnv();
    const body = new LiquidButtonBody(kind, els, {
      holdMs,
      alive,
      onState: (st) => {
        statusRef.current = st;
        const b = btnRef.current;
        if (b) {
          b.setAttribute('data-status', st);
          b.setAttribute('aria-busy', st === 'busy' ? 'true' : 'false');
        }
        const live = liveRef.current;
        if (live) live.textContent = st === 'busy' ? 'Working' : st === 'done' ? announce.current.done : st === 'error' ? announce.current.error : '';
      },
    });
    bodyRef.current = body;
    body.disabled = !!disabled;
    body.setTexts(texts, showPercent ? (p) => `${texts.busy} ${p}%` : undefined);
    body.measure();
    body.scheduleNoise();

    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        rect.current = null;
        body.measure();
      });
      ro.observe(els.button);
    }
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((entries) => {
        const e = entries[entries.length - 1];
        body.visible = !e || e.isIntersecting;
        if (body.visible) body.wakeUp();
      });
      io.observe(els.button);
    }
    // the font changes the text width: fit again once it is in
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    fonts?.ready?.then(() => mounted.current && body.refit());
    mounted.current = true;
    return () => {
      mounted.current = false;
      ro?.disconnect();
      io?.disconnect();
      body.dispose();
      bodyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  useEffect(() => {
    const b = bodyRef.current;
    if (!b) return;
    b.setTexts(texts, showPercent ? (p) => `${texts.busy} ${p}%` : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textKey]);

  useEffect(() => {
    const b = bodyRef.current;
    if (!b) return;
    b.disabled = !!disabled;
    b.holdMs = holdMs;
    b.alive = !!alive;
    b.scheduleNoise();
    b.wakeUp();
  }, [disabled, holdMs, alive]);

  useEffect(() => {
    bodyRef.current?.setProgress(progress);
  }, [progress]);

  useEffect(() => {
    if (status !== undefined) bodyRef.current?.apply(status);
  }, [status]);

  const locate = useCallback((e: PointerEvent<HTMLButtonElement>, fresh: boolean) => {
    const b = bodyRef.current;
    if (!b) return;
    const r = fresh || !rect.current ? (rect.current = e.currentTarget.getBoundingClientRect()) : rect.current;
    b.setPointer(((e.clientX - r.left) / Math.max(1, r.width)) * b.W, ((e.clientY - r.top) / Math.max(1, r.height)) * H);
  }, []);

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const b = bodyRef.current;
    if (!b || disabled) return;
    const st = statusRef.current;
    if (st === 'busy') {
      if (onCancel) {
        onCancel();
        if (status === undefined) b.cancel();
      }
      return;
    }
    if (st === 'done') return;
    const result = onPress?.(e);
    if (status !== undefined) return; // controlled: the app will move the status
    if (isPromise(result)) {
      b.begin(false);
      result.then(
        () => mounted.current && b.apply('done'),
        () => mounted.current && b.apply('error'),
      );
    } else b.begin(true);
  };

  const labelNodes = (['idle', 'busy', 'done', 'error'] as const).map((k, j) => (
    <g key={k} ref={(n) => { labRefs.current[j] = n; }} opacity={j === 0 ? 1 : 0}>
      <text
        ref={(n) => { txtRefs.current[j] = n; }}
        className={s.txt}
        x={kind === 'continue' ? 28 : 92}
        y={46}
        fontSize={28}
      />
    </g>
  ));

  return (
    <>
      <button
        ref={merged}
        type={type}
        className={cx(s.root, s[tone], className)}
        disabled={disabled}
        data-status="idle"
        data-kind={kind}
        aria-busy="false"
        aria-label={ariaLabel ?? labels?.idle ?? d.aria}
        onClick={onClick}
        onPointerEnter={(e) => {
          const b = bodyRef.current;
          if (!b) return;
          if (e.pointerType !== 'touch') b.hover = true;
          locate(e, true);
          b.enterAt(b.px);
          b.wakeUp();
        }}
        onPointerMove={(e) => {
          const b = bodyRef.current;
          if (!b || !b.hover) return;
          locate(e, false);
          b.wakeUp();
        }}
        onPointerLeave={() => {
          const b = bodyRef.current;
          if (!b) return;
          b.hover = false;
          b.press = false;
          rect.current = null;
          b.wakeUp();
        }}
        onPointerDown={(e) => {
          const b = bodyRef.current;
          if (!b) return;
          locate(e, true);
          b.press = true;
          b.wakeUp();
        }}
        onPointerUp={() => {
          const b = bodyRef.current;
          if (!b) return;
          b.press = false;
          b.wakeUp();
        }}
        onPointerCancel={() => {
          const b = bodyRef.current;
          if (!b) return;
          b.press = false;
          b.hover = false;
          b.wakeUp();
        }}
        {...sizeProps(size, style)}
        {...rest}
      >
        <svg ref={svgRef} className={s.svg} viewBox={`0 0 300 ${H}`} aria-hidden="true" focusable="false">
          <defs>
            <clipPath id={ids.clip}>
              <rect ref={clipr} x={0} y={0} width={300} height={H} rx={10.6} />
            </clipPath>
            <clipPath id={ids.lqc}>
              <path ref={lqcp} d="M0 0" />
            </clipPath>
            <linearGradient id={ids.fade} gradientUnits="userSpaceOnUse" x1={0} y1={-120} x2={0} y2={-86}>
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#fff" stopOpacity="1" />
            </linearGradient>
            <mask id={ids.mask} maskUnits="userSpaceOnUse" x={-4000} y={-120} width={8000} height={240}>
              <rect ref={maskr} x={-4000} y={-120} width={8000} height={34} fill={`url(#${ids.fade})`} />
              <rect x={-4000} y={-86} width={8000} height={206} fill="#fff" />
            </mask>
          </defs>
          <g ref={rootRef}>
            <rect ref={bodyEl} className={s.bodyFill} x={0} y={0} width={300} height={H} rx={10.6} />
            <g clipPath={`url(#${ids.clip})`}>
              <path ref={liq} className={s.liq} d="M0 0" />
            </g>
            <g mask={`url(#${ids.mask})`}>
              <path ref={air} className={s.liq} d="M0 0" />
            </g>
            <g clipPath={`url(#${ids.clip})`} className={s.t1}>
              <g id={ids.ct}>
                <path ref={mark} className={s.mark} d="M0 0" />
                <path ref={chk} className={s.stroke} d="M0 0" />
                <path ref={arw} className={s.stroke} d="M0 0" />
                {labelNodes}
              </g>
            </g>
            <g clipPath={`url(#${ids.clip})`}>
              <g clipPath={`url(#${ids.lqc})`} className={s.t2}>
                <use href={`#${ids.ct}`} />
              </g>
            </g>
          </g>
        </svg>
      </button>
      <span ref={liveRef} className={s.sr} role="status" aria-live="polite" />
    </>
  );
});
