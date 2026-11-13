import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { enqueueLabelWrite, cancelLabelGeometryTask } from "./labelGeometryQueue";

/* ══ Label input ══════════════════════════════════════════
   A field whose label is its placeholder until you are in it.
   On focus the label lifts into the top edge with a small hop
   running along its letters, the outline darkens in place, and
   the top line parts under the label from its middle outward.

   ── ONE THING MOVES ─────────────────────────────────────
   The outline is always whole; focus only changes its ink and
   opens the gap. The label is the event, and the line makes
   room for it.

   The gap is two short paths across the notch, each from the
   middle to one side, retracted from the middle outward by a
   negative dash offset. */

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const S = 0.78;
const IN = 0.75;

function computeRingPaths(W: number, H: number, r: number, lw: number, isRtl: boolean) {
  const lx = Math.max(12, r + 2);
  const x0 = isRtl
    ? Math.max(r * 0.5, W - lx - lw * S - 4)
    : Math.max(r * 0.5, lx - 4);
  const x1 = isRtl
    ? Math.min(W - r * 0.5, W - lx + 4)
    : Math.min(W - r, lx + lw * S + 4);
  const a = r - IN;
  const R = W - IN;
  const B = H - IN;
  const mid = W / 2;

  const nm = (x0 + x1) / 2;
  const gapL = `M${nm},${IN} L${x0},${IN}`;
  const gapR = `M${nm},${IN} L${x1},${IN}`;

  const right = r > 0
    ? `M${x1},${IN} L${W - r},${IN} A${a},${a} 0 0 1 ${R},${r} L${R},${H - r} A${a},${a} 0 0 1 ${W - r},${B} L${mid},${B}`
    : `M${x1},${IN} L${R},${IN} L${R},${B} L${mid},${B}`;

  const left = r > 0
    ? `M${x0},${IN} L${r},${IN} A${a},${a} 0 0 0 ${IN},${r} L${IN},${H - r} A${a},${a} 0 0 0 ${r},${B} L${mid},${B}`
    : `M${x0},${IN} L${IN},${IN} L${IN},${B} L${mid},${B}`;

  return { lx, gapL, gapR, right, left };
}

export interface LabelInputProps {
  field?: string;
  label?: string;
  value?: string | number;
  onChange?: (val: any) => void;
  type?: string;
  corner?: number;
  width?: number | string;
  height?: number;
  showcase?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  inputRef?: React.Ref<HTMLInputElement>;
  error?: string;
  errorId?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export function LabelInput({
  field = "Email",
  label: explicitLabel,
  value: controlledValue,
  onChange,
  type,
  corner = 12,
  width = "100%",
  height = 40,
  showcase = false,
  className = "",
  disabled = false,
  autoFocus = false,
  id: customId,
  name,
  required = false,
  min,
  max,
  step,
  prefix,
  suffix,
  inputRef: externalInputRef,
  error,
  errorId,
  onKeyDown,
  onFocus: explicitOnFocus,
  onBlur: explicitOnBlur,
}: LabelInputProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rightPathRef = useRef<SVGPathElement | null>(null);
  const leftPathRef = useRef<SVGPathElement | null>(null);
  const gapLPathRef = useRef<SVGPathElement | null>(null);
  const gapRPathRef = useRef<SVGPathElement | null>(null);
  const lab = useRef<HTMLLabelElement | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  const generatedId = `lbi-${useId().replace(/:/g, "")}`;
  const id = customId || generatedId;
  const resolvedErrorId = errorId || `${id}-error`;

  const label = explicitLabel || field;
  const isSecret = type === "password" || field.toLowerCase().includes("password") || label.toLowerCase().includes("password");

  const [focus, setFocus] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const [show, setShow] = useState(false);
  const [flip, setFlip] = useState(0);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const [quiet] = useState(() => showcase && typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);

  const isDateTime =
    type === "date" ||
    type === "time" ||
    type === "datetime-local" ||
    type === "month" ||
    type === "week";

  const isRtl =
    (typeof document !== "undefined" && document.documentElement.dir === "rtl") ||
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(label);
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(label);

  const up = focus || isDateTime || (value !== undefined && value !== null && String(value).length > 0);

  const H = height;
  const r = clamp(corner, 0, H / 2);
  const initialW = Math.max(80, typeof width === "number" ? width : 240);
  const lastGeomRef = useRef<{ W: number; lw: number }>({ W: initialW, lw: 48 });
  const measuredBoxWRef = useRef<number>(0);
  const measuredLabWRef = useRef<number>(0);

  const commitSvgPaths = useRef(() => {});
  commitSvgPaths.current = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const rawW = typeof width === "number" ? width : measuredBoxWRef.current;
    if (rawW <= 0) return;
    const W = Math.max(80, Math.round(rawW));
    const lw = measuredLabWRef.current > 0 ? measuredLabWRef.current : lastGeomRef.current.lw;
    if (lastGeomRef.current.W === W && lastGeomRef.current.lw === lw && svg.getAttribute("viewBox") === `0 0 ${W} ${H}`) {
      return;
    }
    lastGeomRef.current = { W, lw };
    const paths = computeRingPaths(W, H, r, lw, isRtl);

    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    rightPathRef.current?.setAttribute("d", paths.right);
    leftPathRef.current?.setAttribute("d", paths.left);
    gapLPathRef.current?.setAttribute("d", paths.gapL);
    gapRPathRef.current?.setAttribute("d", paths.gapR);
  };

  const syncGeometry = useRef(() => {});
  syncGeometry.current = () => {
    const box = boxRef.current;
    const svg = svgRef.current;
    if (!box || !svg) return;

    const rawW = typeof width === "number" ? width : box.offsetWidth;
    if (rawW <= 0) return;
    measuredBoxWRef.current = rawW;
    if (lab.current && lab.current.offsetWidth > 0) {
      measuredLabWRef.current = lab.current.offsetWidth;
    }
    commitSvgPaths.current();
  };

  useLayoutEffect(() => {
    syncGeometry.current();
  }, [width, height, corner, label, isRtl]);

  useEffect(() => {
    const box = boxRef.current;
    const labelEl = lab.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const queuedWrite = () => commitSvgPaths.current();
    const observer = new ResizeObserver((entries) => {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const w = Math.round(entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width);
        if (w <= 0) continue;
        if (entry.target === box) {
          measuredBoxWRef.current = w;
        } else if (entry.target === labelEl) {
          measuredLabWRef.current = w;
        }
      }
      enqueueLabelWrite(queuedWrite);
    });
    observer.observe(box);
    if (labelEl) observer.observe(labelEl);
    return () => {
      cancelLabelGeometryTask(queuedWrite);
      observer.disconnect();
    };
  }, [width, label]);

  useEffect(() => {
    if (controlledValue === undefined) {
      setInternalValue("");
      setShow(false);
    }
  }, [field, controlledValue]);

  const initialPaths = useMemo(
    () => computeRingPaths(initialW, H, r, lastGeomRef.current.lw, isRtl),
    [initialW, H, r, isRtl]
  );

  const labelSpans = useMemo(() => {
    if (hasArabic || isRtl) {
      return label.split(/(\s+)/).map((segment, i) => (
        <span key={i} style={{ "--i": i, display: "inline-block" } as React.CSSProperties}>
          {segment === " " ? "\u00A0" : segment}
        </span>
      ));
    }
    return [...label].map((ch, i) => (
      <span key={i} style={{ "--i": i } as React.CSSProperties}>
        {ch === " " ? "\u00A0" : ch}
      </span>
    ));
  }, [label, hasArabic, isRtl]);

  const setInputRefs = (el: HTMLInputElement | null) => {
    input.current = el;
    if (!externalInputRef) return;
    if (typeof externalInputRef === "function") {
      externalInputRef(el);
    } else {
      (externalInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    }
  };

  const reveal = () => {
    setShow((s) => !s);
    setFlip((f) => f + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    if (!onChange) return;
    const hybrid: any = new String(val);
    hybrid.target = e.target;
    hybrid.currentTarget = e.currentTarget;
    hybrid.preventDefault = () => e.preventDefault?.();
    hybrid.stopPropagation = () => e.stopPropagation?.();
    hybrid.valueOf = () => val;
    hybrid.toString = () => val;
    onChange(hybrid);
  };

  return (
    <div
      ref={boxRef}
      className={`lbi ${className}`}
      data-up={Boolean(up)}
      data-focus={focus}
      data-filled={Boolean(value !== undefined && value !== null && String(value).length > 0)}
      data-has-prefix={Boolean(prefix)}
      data-invalid={Boolean(error)}
      style={{ width: typeof width === "number" ? `${width}px` : width }}
    >
      <div
        className="lbi-box"
        style={{
          width: typeof width === "number" ? `${width}px` : "100%",
          height: H,
          borderRadius: r,
          "--lbi-x": `${initialPaths.lx}px`,
        } as React.CSSProperties}
      >
        <svg ref={svgRef} className="lbi-ring" width="100%" height={H} viewBox={`0 0 ${initialW} ${H}`} aria-hidden="true">
          <path ref={rightPathRef} d={initialPaths.right} style={error ? { stroke: "#B8321C", strokeWidth: 1.5 } : undefined} />
          <path ref={leftPathRef} d={initialPaths.left} style={error ? { stroke: "#B8321C", strokeWidth: 1.5 } : undefined} />
          <path ref={gapLPathRef} className="lbi-gap" d={initialPaths.gapL} pathLength={1} style={error ? { stroke: "#B8321C", strokeWidth: 1.5 } : undefined} />
          <path ref={gapRPathRef} className="lbi-gap" d={initialPaths.gapR} pathLength={1} style={error ? { stroke: "#B8321C", strokeWidth: 1.5 } : undefined} />
        </svg>

        <label
          className="lbi-label"
          htmlFor={id}
          ref={lab}
          dir={isRtl ? "rtl" : "ltr"}
          style={error ? { color: "#B8321C" } : undefined}
        >
          {labelSpans}
        </label>

        {prefix && (
          <div className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 z-10 flex items-center pointer-events-none text-neutral-400">
            {prefix}
          </div>
        )}

        <input
          ref={setInputRefs}
          id={id}
          name={name}
          className="lbi-field"
          data-flip={flip % 2}
          type={isSecret && !show ? "password" : isSecret ? "text" : type || (field.toLowerCase().includes("email") ? "email" : "text")}
          value={value !== undefined ? String(value) : ""}
          onChange={handleInputChange}
          onFocus={(e) => {
            setFocus(true);
            explicitOnFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            explicitOnBlur?.(e);
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          autoFocus={autoFocus}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? resolvedErrorId : undefined}
          min={min}
          max={max}
          step={step}
          inputMode={quiet ? "none" : undefined}
          style={{
            paddingLeft: isRtl ? (isSecret ? 48 : suffix ? 44 : (prefix ? 38 : initialPaths.lx)) : (prefix ? 38 : initialPaths.lx),
            paddingRight: isRtl ? (prefix ? 38 : (isSecret ? 48 : suffix ? 44 : initialPaths.lx)) : (isSecret ? 48 : suffix ? 44 : initialPaths.lx),
            textAlign: isRtl ? "right" : "left",
          }}
        />

        {suffix && !isSecret && (
          <div className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 z-10 flex items-center text-neutral-400">
            {suffix}
          </div>
        )}

        {isSecret && (
          <button
            className="lbi-eye"
            type="button"
            data-show={show}
            onPointerDown={(e) => e.preventDefault()}
            onClick={reveal}
            aria-label={show ? "Hide password" : "Show password"}
          >
            <Eye size={16} strokeWidth={2} aria-hidden="true" />
            <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>

      {error && (
        <p
          id={resolvedErrorId}
          role="alert"
          className="mt-1 text-[11.5px] font-medium text-[#B8321C] flex items-center gap-1"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export default LabelInput;

