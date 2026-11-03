'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MutableRefObject, Ref, RefCallback } from 'react';

/** useLayoutEffect on the client, useEffect on the server (no SSR warning). */
export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Controlled / uncontrolled state in one hook.
 * Pass `value` to control it; otherwise it is kept internally, starting at `defaultValue`.
 */
export function useControllable<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
): [T, (next: T) => void] {
  const [inner, setInner] = useState<T>(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? (value as T) : inner;
  const cb = useRef<((next: T) => void) | undefined>(onChange);
  cb.current = onChange;
  const currentRef = useRef(current);
  currentRef.current = current;

  const set = useCallback(
    (next: T) => {
      if (Object.is(next, currentRef.current)) return;
      if (!controlled) setInner(next);
      cb.current?.(next);
    },
    [controlled],
  );
  return [current, set];
}

export function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (!ref) return;
  if (typeof ref === 'function') ref(node);
  else (ref as MutableRefObject<T | null>).current = node;
}

/** Merge several refs (forwarded + internal) into one callback ref. */
export function useMergedRef<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((node: T | null) => refs.forEach((r) => assignRef(r, node)), refs);
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export type Size = 'sm' | 'md' | 'lg' | number;

/**
 * Size → props. `sm | md | lg` map to 28 / 34 / 44 px through tokens.css; a number is a height in px.
 * Leave it undefined to inherit `--atr-h` from the surrounding context, so a whole toolbar can be
 * resized by setting one variable on its container.
 */
export function sizeProps(size: Size | undefined, style?: CSSProperties) {
  if (size === undefined) return { style };
  if (typeof size === 'number') {
    return { style: { ...style, ['--atr-h' as string]: `${size}px` } as CSSProperties };
  }
  return { 'data-atr-size': size, style };
}
