'use client';

import { forwardRef, useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes, PointerEvent } from 'react';
import { cx, sizeProps, useControllable, useIsoLayoutEffect, useMergedRef } from '../../hooks';
import type { Size } from '../../hooks';
import { wake } from '../../motion/loop';
import { ToggleBody } from './toggleBody';
import s from './Toggle.module.css';

export interface ToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'role' | 'value' | 'defaultValue' | 'children'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: Size;
  /** posts "on" with a native <form> when checked */
  name?: string;
}

/**
 * A switch drawn as a tilted tube of liquid. Click, press Space/Enter, or drag the pool.
 * `role="switch"` + `aria-checked`: give it an aria-label or a <label htmlFor>.
 */
export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { checked: checkedProp, defaultChecked, onCheckedChange, size, name, className, style, disabled, onClick, ...rest },
  ref,
) {
  const [checked, setChecked] = useControllable<boolean>(checkedProp, defaultChecked ?? false, onCheckedChange);
  const rootRef = useRef<HTMLButtonElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const poolRef = useRef<HTMLSpanElement>(null);
  const knobRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<ToggleBody | null>(null);
  const merged = useMergedRef<HTMLButtonElement>(ref, rootRef);
  const checkedRef = useRef(checked);
  checkedRef.current = checked;
  const gesture = useRef({ x0: 0, suppressClick: false });

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const pool = poolRef.current;
    const knob = knobRef.current;
    if (!root || !track || !pool || !knob) return;
    const body = new ToggleBody(root, track, pool, knob, checkedRef.current);
    bodyRef.current = body;
    const sync = () => {
      body.measure();
      body.snap();
      body.render();
    };
    sync();
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(sync);
      ro.observe(root);
    }
    return () => {
      ro?.disconnect();
      body.dispose();
      bodyRef.current = null;
    };
  }, []);

  useEffect(() => {
    bodyRef.current?.setOn(checked);
  }, [checked]);

  /** pointer x in tube heights, measured on the (untransformed) button */
  const localX = (e: PointerEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const H = bodyRef.current?.H || 1;
    return (e.clientX - r.left) / H;
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    const body = bodyRef.current;
    if (!body || disabled || e.button !== 0) return;
    gesture.current.suppressClick = false;
    gesture.current.x0 = localX(e);
    body.press = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not capturable (synthetic event): drag still works inside the button */
    }
    body.measure();
    wake(body); // a press squashes the tube slightly
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const body = bodyRef.current;
    if (!body || !body.press) return;
    const x = localX(e);
    if (Math.abs(x - gesture.current.x0) > 6 / body.H || body.drag !== null) {
      body.drag = x;
      wake(body);
    }
  };

  const release = (commit: boolean) => {
    const body = bodyRef.current;
    if (!body) return;
    body.press = false;
    if (body.drag !== null) {
      const v = body.drag > 1; // past the middle of the tube
      body.drag = null;
      gesture.current.suppressClick = true;
      if (commit && v !== checkedRef.current) setChecked(v);
    }
    wake(body);
  };

  return (
    <>
      <button
        ref={merged}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={cx(s.root, className)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => release(true)}
        onPointerCancel={() => release(false)}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented) return;
          if (gesture.current.suppressClick) {
            gesture.current.suppressClick = false;
            return;
          }
          setChecked(!checkedRef.current);
        }}
        {...sizeProps(size, style)}
        {...rest}
      >
        <span ref={trackRef} className={s.track} aria-hidden="true">
          <span ref={poolRef} className={s.pool} />
          <span ref={knobRef} className={s.knob} />
        </span>
      </button>
      {name ? <input type="checkbox" hidden name={name} checked={checked} readOnly /> : null}
    </>
  );
});
