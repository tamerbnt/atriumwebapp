import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { enqueueLabelWrite, cancelLabelGeometryTask } from './labelGeometryQueue';
import { squircleNotchedRingPaths, squirclePath } from '@/atrium/motion/shapes';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const S = 0.86;
const IN = 0.75;

function computeRingPaths(W: number, H: number, r: number, lw: number, isRtl: boolean) {
  const lx = Math.max(12, r + 2);
  const maxGapW = Math.max(16, W - lx * 2 - 4);
  const gapW = Math.min(maxGapW, lw * S + 8);
  const x0 = isRtl
    ? Math.max(r * 0.5, W - lx - gapW)
    : Math.max(r * 0.5, lx - 4);
  const x1 = isRtl
    ? Math.min(W - r * 0.5, W - lx + 4)
    : Math.min(W - r * 0.5, lx + gapW - 4);
  const ring = squircleNotchedRingPaths(W, H, r, IN, x0, x1, 0.6);
  const bg = squirclePath(0, 0, W, H, r, 0.6);
  return { lx, bg, ...ring };
}

export interface LabelTextareaProps {
  field?: string;
  label?: string;
  value?: string;
  onChange?: (val: string) => void;
  rows?: number;
  corner?: number;
  width?: number | string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  maxLength?: number;
  error?: string;
  errorId?: string;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
}

export function LabelTextarea({
  field,
  label: explicitLabel,
  value: controlledValue,
  onChange,
  rows = 3,
  corner = 12,
  width = '100%',
  className = '',
  placeholder,
  disabled = false,
  autoFocus = false,
  id: customId,
  name,
  required = false,
  maxLength,
  error,
  errorId,
  onFocus: explicitOnFocus,
  onBlur: explicitOnBlur,
}: LabelTextareaProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const bgRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rightPathRef = useRef<SVGPathElement | null>(null);
  const leftPathRef = useRef<SVGPathElement | null>(null);
  const gapLPathRef = useRef<SVGPathElement | null>(null);
  const gapRPathRef = useRef<SVGPathElement | null>(null);
  const lab = useRef<HTMLLabelElement | null>(null);

  const generatedId = `lbt-${useId().replace(/:/g, '')}`;
  const id = customId || generatedId;
  const resolvedErrorId = errorId || `${id}-error`;

  const label = explicitLabel || field || '';
  const [focus, setFocus] = useState(false);
  const [internalValue, setInternalValue] = useState('');
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(label);
  const isRtl =
    (typeof document !== 'undefined' && document.documentElement.dir === 'rtl') ||
    hasArabic;

  const up = focus || (value !== undefined && value !== null && String(value).length > 0);

  const minH = Math.max(76, rows * 22 + 24);
  const r = clamp(corner, 0, minH / 2);
  const initialW = Math.max(80, typeof width === 'number' ? width : 240);
  const lastGeomRef = useRef<{ W: number; H: number; lw: number }>({
    W: initialW,
    H: minH,
    lw: 48,
  });
  const measuredBoxWRef = useRef<number>(0);
  const measuredBoxHRef = useRef<number>(minH);
  const measuredLabWRef = useRef<number>(0);

  const commitSvgPaths = useRef(() => {});
  commitSvgPaths.current = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const rawW = typeof width === 'number' ? width : measuredBoxWRef.current;
    const rawH = measuredBoxHRef.current;
    if (rawW <= 0 || rawH <= 0) return;
    const W = Math.max(80, Math.round(rawW));
    const H = Math.max(minH, Math.round(rawH));
    const lw = measuredLabWRef.current > 0 ? measuredLabWRef.current : lastGeomRef.current.lw;
    if (
      lastGeomRef.current.W === W &&
      lastGeomRef.current.H === H &&
      lastGeomRef.current.lw === lw &&
      svg.getAttribute('viewBox') === `0 0 ${W} ${H}`
    ) {
      return;
    }
    lastGeomRef.current = { W, H, lw };
    const paths = computeRingPaths(W, H, clamp(corner, 0, H / 2), lw, isRtl);

    if (bgRef.current && paths.bg) {
      const clipStr = `path('${paths.bg}')`;
      bgRef.current.style.clipPath = clipStr;
      (bgRef.current.style as any).webkitClipPath = clipStr;
    }
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('height', String(H));
    rightPathRef.current?.setAttribute('d', paths.right);
    leftPathRef.current?.setAttribute('d', paths.left);
    gapLPathRef.current?.setAttribute('d', paths.gapL);
    gapRPathRef.current?.setAttribute('d', paths.gapR);
  };

  const syncGeometry = useRef(() => {});
  syncGeometry.current = () => {
    const inner = innerRef.current;
    const svg = svgRef.current;
    if (!inner || !svg) return;
    const rawW = typeof width === 'number' ? width : inner.offsetWidth;
    const rawH = inner.offsetHeight || minH;
    if (rawW <= 0) return;
    measuredBoxWRef.current = rawW;
    measuredBoxHRef.current = rawH;
    if (lab.current && lab.current.offsetWidth > 0) {
      measuredLabWRef.current = lab.current.offsetWidth;
    }
    commitSvgPaths.current();
  };

  useLayoutEffect(() => {
    syncGeometry.current();
  }, [width, rows, corner, label, isRtl, value]);

  useEffect(() => {
    const inner = innerRef.current;
    const labelEl = lab.current;
    if (!inner || typeof ResizeObserver === 'undefined') return;
    const queuedWrite = () => commitSvgPaths.current();
    const observer = new ResizeObserver((entries) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const w = Math.round(entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
        const h = Math.round(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
        if (entry.target === inner) {
          if (w > 0) measuredBoxWRef.current = w;
          if (h > 0) measuredBoxHRef.current = h;
        } else if (entry.target === labelEl && w > 0) {
          measuredLabWRef.current = w;
        }
      }
      enqueueLabelWrite(queuedWrite);
    });
    observer.observe(inner);
    if (labelEl) observer.observe(labelEl);
    return () => {
      cancelLabelGeometryTask(queuedWrite);
      observer.disconnect();
    };
  }, [width, label]);

  const initialPaths = useMemo(
    () => computeRingPaths(initialW, minH, r, lastGeomRef.current.lw, isRtl),
    [initialW, minH, r, isRtl]
  );

  const labelSpans = useMemo(() => {
    if (hasArabic || isRtl) {
      return label.split(/(\s+)/).map((segment, i) => (
        <span key={i} style={{ '--i': i, display: 'inline-block' } as React.CSSProperties}>
          {segment === ' ' ? '\u00A0' : segment}
        </span>
      ));
    }
    return [...label].map((ch, i) => (
      <span key={i} style={{ '--i': i } as React.CSSProperties}>
        {ch === ' ' ? '\u00A0' : ch}
      </span>
    ));
  }, [label, hasArabic, isRtl]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    onChange?.(val);
  };

  return (
    <div
      ref={boxRef}
      className={`lbi flex flex-col gap-[var(--s1,4px)] ${className}`}
      data-up={Boolean(up)}
      data-focus={focus}
      data-filled={Boolean(value !== undefined && value !== null && String(value).length > 0)}
      data-multiline="true"
      data-invalid={Boolean(error)}
      data-rtl={isRtl ? 'true' : undefined}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        '--lbi-scale': String(S),
        '--lbi-lift': `${minH / 2}px`,
      } as React.CSSProperties}
    >
      <div
        ref={innerRef}
        className="lbi-box"
        style={{
          width: typeof width === 'number' ? `${width}px` : '100%',
          minHeight: minH,
          '--lbi-x': `${initialPaths.lx}px`,
        } as React.CSSProperties}
      >
        <div
          ref={bgRef}
          className="lbi-bg"
          aria-hidden="true"
          style={initialPaths.bg ? { clipPath: `path('${initialPaths.bg}')` } : undefined}
        />
        <svg
          ref={svgRef}
          className="lbi-ring"
          width="100%"
          height={minH}
          viewBox={`0 0 ${initialW} ${minH}`}
          aria-hidden="true"
        >
          <path ref={rightPathRef} d={initialPaths.right} style={error ? { stroke: '#B8321C', strokeWidth: 1.5 } : undefined} />
          <path ref={leftPathRef} d={initialPaths.left} style={error ? { stroke: '#B8321C', strokeWidth: 1.5 } : undefined} />
          <path ref={gapLPathRef} className="lbi-gap" d={initialPaths.gapL} pathLength={1} style={error ? { stroke: '#B8321C', strokeWidth: 1.5 } : undefined} />
          <path ref={gapRPathRef} className="lbi-gap" d={initialPaths.gapR} pathLength={1} style={error ? { stroke: '#B8321C', strokeWidth: 1.5 } : undefined} />
        </svg>

        <label
          className="lbi-label"
          htmlFor={id}
          ref={lab}
          dir={isRtl ? 'rtl' : 'ltr'}
          style={error ? { color: '#B8321C' } : undefined}
        >
          {labelSpans}
        </label>

        <textarea
          id={id}
          name={name}
          rows={rows}
          className="lbi-textarea-field"
          value={value !== undefined ? String(value) : ''}
          placeholder={up ? placeholder : ''}
          onChange={handleChange}
          onFocus={(e) => {
            setFocus(true);
            explicitOnFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            explicitOnBlur?.(e);
          }}
          disabled={disabled}
          autoFocus={autoFocus}
          required={required}
          maxLength={maxLength}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? resolvedErrorId : undefined}
          style={{
            minHeight: minH,
            paddingInline: initialPaths.lx,
            textAlign: isRtl ? 'right' : 'left',
          }}
        />
      </div>

      {error && (
        <p
          id={resolvedErrorId}
          role="alert"
          className="t-small text-[#B8321C] flex items-center gap-[var(--s1,4px)]"
        >
          <AlertCircle size={16} strokeWidth={1.5} className="shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export default LabelTextarea;
