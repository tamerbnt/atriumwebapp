'use client';

import { forwardRef, useEffect, useRef } from 'react';
import type { KeyboardEvent, ReactElement, ReactNode, Ref, CSSProperties } from 'react';
import { cx, sizeProps, useControllable, useIsoLayoutEffect, useMergedRef } from '../../hooks';
import type { Size } from '../../hooks';
import { SegBody } from './segBody';
import s from './Segmented.module.css';

export interface SegmentedOption<T extends string = string> {
  value: T;
  /** omit for an icon-only option, and give it an aria-label */
  label?: ReactNode;
  tooltip?: string;
  icon?: ReactNode;
  'aria-label'?: string;
  disabled?: boolean;
}

export interface SegmentedProps<T extends string = string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  size?: Size;
  /** name the group for screen readers, e.g. "View" */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  style?: CSSProperties;
}

function SegmentedInner<T extends string>(props: SegmentedProps<T>, ref: Ref<HTMLDivElement>) {
  const { options, size, className, style } = props;
  const [value, setValue] = useControllable<T | undefined>(
    props.value,
    props.defaultValue ?? options.find((o) => !o.disabled)?.value,
    props.onValueChange as ((v: T | undefined) => void) | undefined,
  );
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const groupRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLSpanElement>(null);
  const optRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const bodyRef = useRef<SegBody | null>(null);
  const idxRef = useRef(idx);
  idxRef.current = idx;
  const merged = useMergedRef<HTMLDivElement>(ref, groupRef);

  // build the blob once the DOM exists; re-measure when the group resizes or fonts arrive
  useIsoLayoutEffect(() => {
    const group = groupRef.current;
    const blob = blobRef.current;
    if (!group || !blob) return;
    const opts = optRefs.current.slice(0, options.length).filter(Boolean) as HTMLButtonElement[];
    const body = new SegBody(group, blob, opts);
    bodyRef.current = body;
    const sync = () => {
      body.measure();
      body.setIndex(idxRef.current, false);
    };
    sync();
    group.setAttribute('data-live', 'true');
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(sync);
      ro.observe(group);
    }
    let alive = true;
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => alive && sync());
    }
    return () => {
      alive = false;
      ro?.disconnect();
      body.dispose();
      bodyRef.current = null;
      group.removeAttribute('data-live');
    };
  }, [options.length]);

  // a value change (click, key, or the parent) slides the blob
  useEffect(() => {
    bodyRef.current?.setIndex(idx, true);
  }, [idx]);

  const choose = (j: number, focus: boolean) => {
    const o = options[j];
    if (!o || o.disabled) return;
    setValue(o.value);
    if (focus) optRefs.current[j]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
    if (!enabled.length) return;
    const pos = enabled.indexOf(idx);
    const rtl = groupRef.current ? getComputedStyle(groupRef.current).direction === 'rtl' : false;
    let next: number | undefined;
    switch (e.key) {
      case 'ArrowRight':
        next = enabled[(pos + (rtl ? -1 : 1) + enabled.length) % enabled.length];
        break;
      case 'ArrowLeft':
        next = enabled[(pos + (rtl ? 1 : -1) + enabled.length) % enabled.length];
        break;
      case 'ArrowDown':
        next = enabled[(pos + 1) % enabled.length];
        break;
      case 'ArrowUp':
        next = enabled[(pos - 1 + enabled.length) % enabled.length];
        break;
      case 'Home':
        next = enabled[0];
        break;
      case 'End':
        next = enabled[enabled.length - 1];
        break;
      default:
        return;
    }
    e.preventDefault();
    choose(next, true);
  };

  const sp = sizeProps(size, style);
  return (
    <div
      ref={merged}
      role="radiogroup"
      aria-label={props['aria-label']}
      aria-labelledby={props['aria-labelledby']}
      className={cx(s.root, className)}
      onKeyDown={onKeyDown}
      {...sp}
    >
      <span ref={blobRef} className={s.bl} aria-hidden="true" />
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => {
            optRefs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={i === idx}
          aria-label={o['aria-label']}
          title={o.tooltip}
          disabled={o.disabled}
          tabIndex={i === idx ? 0 : -1}
          className={cx(s.so, o.label == null && s.ic)}
          onClick={() => choose(i, false)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A radio group drawn as a pill with a liquid blob that slides to the chosen option. */
export const Segmented = forwardRef(
  SegmentedInner as (props: SegmentedProps<string>, ref: Ref<HTMLDivElement>) => ReactElement | null,
) as <T extends string = string>(props: SegmentedProps<T> & { ref?: Ref<HTMLDivElement> }) => ReactElement | null;
