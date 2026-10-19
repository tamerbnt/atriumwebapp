import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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
}

export function LabelInput({
  field = "Email",
  label: explicitLabel,
  value: controlledValue,
  onChange,
  type,
  corner = 20,
  width = 280,
  height = 52,
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
}: LabelInputProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [measuredW, setMeasuredW] = useState<number>(typeof width === "number" ? width : 280);

  useLayoutEffect(() => {
    if (typeof width === "number") {
      setMeasuredW(width);
      return;
    }
    if (boxRef.current) {
      const rect = boxRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        setMeasuredW(Math.round(rect.width));
      }
    }
  }, [width]);

  useEffect(() => {
    if (typeof width === "number" || !boxRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setMeasuredW(Math.round(entry.contentRect.width));
        }
      }
    });
    observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, [width]);

  const W = measuredW;
  const H = height;
  const r = clamp(corner, 0, H / 2);
  const generatedId = `lbi-${useId().replace(/:/g, "")}`;
  const id = customId || generatedId;

  const label = explicitLabel || field;
  const isSecret = type === "password" || field.toLowerCase().includes("password") || label.toLowerCase().includes("password");

  const [focus, setFocus] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const [show, setShow] = useState(false);
  const [flip, setFlip] = useState(0);
  const input = useRef<HTMLInputElement | null>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const [quiet] = useState(() => showcase && typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);

  /* the notch is the label's own width, so it is measured */
  const lab = useRef<HTMLLabelElement | null>(null);
  const [lw, setLw] = useState(48);
  useLayoutEffect(() => {
    if (lab.current) setLw(lab.current.offsetWidth);
  }, [label]);

  useEffect(() => {
    if (controlledValue === undefined) {
      setInternalValue("");
      setShow(false);
    }
  }, [field, controlledValue]);

  const up = focus || (value !== undefined && value !== null && String(value).length > 0);

  /* ── where the label sits, and the gap it leaves ─────────
     Never inside the corner's curve: the notch has to open on
     the straight part of the top edge, so a rounder field
     starts its label further in. */
  const lx = Math.max(14, r + 4);
  const x0 = Math.max(r * 0.6, lx - 5);
  const x1 = lx + lw * S + 5;
  const a = r - IN;
  const R = W - IN;
  const B = H - IN;
  const mid = W / 2;

  /* the gap, as two halves from its middle to each side */
  const nm = (x0 + x1) / 2;
  const gapL = `M${nm},${IN} L${x0},${IN}`;
  const gapR = `M${nm},${IN} L${x1},${IN}`;

  /* right: from the notch, clockwise, to the bottom middle */
  const right = r > 0
    ? `M${x1},${IN} L${W - r},${IN} A${a},${a} 0 0 1 ${R},${r} L${R},${H - r} A${a},${a} 0 0 1 ${W - r},${B} L${mid},${B}`
    : `M${x1},${IN} L${R},${IN} L${R},${B} L${mid},${B}`;

  /* left: from the notch, the other way round, to the same point */
  const left = r > 0
    ? `M${x0},${IN} L${r},${IN} A${a},${a} 0 0 0 ${IN},${r} L${IN},${H - r} A${a},${a} 0 0 0 ${r},${B} L${mid},${B}`
    : `M${x0},${IN} L${IN},${IN} L${IN},${B} L${mid},${B}`;

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
    // Provide a hybrid that works as a primitive string AND satisfies (e) => e.target.value
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
      style={{ width: typeof width === "number" ? `${width}px` : width }}
    >
      <div
        className="lbi-box"
        style={{ width: W, height: H, borderRadius: r, "--lbi-x": `${lx}px` } as React.CSSProperties}
      >
        <svg className="lbi-ring" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <path d={right} />
          <path d={left} />
          <path className="lbi-gap" d={gapL} pathLength={1} />
          <path className="lbi-gap" d={gapR} pathLength={1} />
        </svg>

        <label className="lbi-label" htmlFor={id} ref={lab}>
          {[...label].map((ch, i) => (
            <span key={i} style={{ "--i": i } as React.CSSProperties}>
              {ch === " " ? "\u00A0" : ch}
            </span>
          ))}
        </label>

        <input
          ref={input}
          id={id}
          name={name}
          className="lbi-field"
          data-flip={flip % 2}
          type={isSecret && !show ? "password" : isSecret ? "text" : type || (field.toLowerCase().includes("email") ? "email" : "text")}
          value={value !== undefined ? String(value) : ""}
          onChange={handleInputChange}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          autoFocus={autoFocus}
          required={required}
          min={min}
          max={max}
          step={step}
          inputMode={quiet ? "none" : undefined}
          style={{ paddingRight: isSecret ? 48 : lx }}
        />

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
    </div>
  );
}

export default LabelInput;
