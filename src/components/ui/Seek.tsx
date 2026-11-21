import React, { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useAtriumSelector } from "../../services/store";
import { syncSquircleNow } from "../../utils/squircle";

/* ══ Seek ═════════════════════════════════════════════════
   A search icon that becomes a search field, as one object.

   ONE OBJECT, NOT TWO. Everything here follows from that. The
   obvious build is an icon that fades out and an input that
   fades in, and it is obvious because it is easy — but two
   things swapping is never mistaken for one thing changing,
   however well the crossfade is tuned. So there is a single
   box whose WIDTH is the state, and the icon and the field
   are both inside it the whole time.

   Which turns the interesting problems into geometry rather
   than choreography:
   · The lens never moves relative to the box. It sits at a
     fixed left inset; the box grows around it.
   · The field slides slightly from left to right as the box opens.
*/

export interface SeekProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  openWidth?: number;
  shutSize?: number;
  shape?: "capsule" | "squircle";
  variant?: "pill" | "ghost";
  onSearch?: (val: string) => void;
  autoFocusOnOpen?: boolean;
}

export const Seek: React.FC<SeekProps> = React.memo(({
  value,
  onChange,
  placeholder,
  className = "",
  openWidth = 260,
  shutSize = 40,
  shape = "capsule",
  variant = "pill",
  onSearch,
  autoFocusOnOpen = true,
}) => {
  const language = useAtriumSelector((s) => s.language);
  const defaultPlaceholder = language === 'ar' ? 'بحث...' : language === 'fr' ? 'Rechercher...' : 'Search...';
  const effectivePlaceholder = placeholder !== undefined ? placeholder : defaultPlaceholder;
  const [isOpen, setIsOpen] = useState(Boolean(value && value.length > 0));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const skinRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const busyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    return () => {
      if (busyTimerRef.current) clearTimeout(busyTimerRef.current);
    };
  }, []);

  // If value is set externally, open automatically
  useEffect(() => {
    if (value && value.length > 0) {
      setIsOpen(true);
    }
  }, [value]);

  // Keep 60% squircle clip-path & SVG border synced with the 280ms CSS width spring
  useEffect(() => {
    if (shape !== "squircle") return;
    const el = skinRef.current;
    if (!el) return;
    syncSquircleNow(el);
    let raf = 0;
    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    const tick = () => {
      syncSquircleNow(el);
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (now - start < 330) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isOpen, shape, shutSize, openWidth]);

  // Click outside to collapse if empty (only active while open)
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target || !document.contains(target)) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        if (!valueRef.current || valueRef.current.trim().length === 0) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Handle opening
  const handleOpen = () => {
    setIsOpen(true);
    if (autoFocusOnOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  const handleToggle = () => {
    if (isOpen) {
      if (!value || value.trim().length === 0) {
        setIsOpen(false);
      } else {
        inputRef.current?.focus();
      }
    } else {
      handleOpen();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (value) {
        onChange("");
      } else {
        setIsOpen(false);
      }
    } else if (e.key === "Enter" && onSearch) {
      onSearch(value);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    // Pulse busy attribute on typing without triggering React re-renders
    if (containerRef.current) {
      containerRef.current.setAttribute("data-busy", "true");
    }
    if (busyTimerRef.current) clearTimeout(busyTimerRef.current);
    busyTimerRef.current = setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.setAttribute("data-busy", "false");
      }
    }, 280);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    inputRef.current?.focus();
  };

  // Dimensions
  const currentWidth = isOpen ? openWidth : shutSize;
  const lensSize = 16;
  const inset = Math.max(8, Math.round((shutSize - lensSize) / 2));
  const say = isOpen ? 1 : 0;

  const isSquircle = shape === "squircle";
  const sqToken = isSquircle ? (shutSize <= 34 ? "ctl-sm" : "ctl") : undefined;

  return (
    <div
      ref={containerRef}
      className={`sek ${className}`}
      data-open={isOpen ? "true" : "false"}
      data-press="false"
      data-busy="false"
      data-shape={shape}
      data-variant={variant}
      style={
        {
          "--frame": `${isOpen ? openWidth : shutSize}px`,
          "--frameh": `${shutSize}px`,
        } as React.CSSProperties
      }
    >
      <div
        ref={skinRef}
        data-sq={sqToken}
        data-sq-border={isSquircle ? "solid" : undefined}
        className={`sek-skin ${!isOpen ? 'cursor-pointer' : ''}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.sek-clear')) return;
          if (!isOpen) {
            handleOpen();
          } else {
            inputRef.current?.focus();
          }
        }}
        onMouseDown={() => containerRef.current?.setAttribute("data-press", "true")}
        onMouseUp={() => containerRef.current?.setAttribute("data-press", "false")}
        onMouseLeave={() => containerRef.current?.setAttribute("data-press", "false")}
        style={
          {
            "--w": `${currentWidth}px`,
            "--shut": `${shutSize}px`,
            "--sek-r": isSquircle ? (shutSize <= 34 ? "var(--r-ctl-sm, 10px)" : "var(--r-ctl, 12px)") : `${Math.round(shutSize / 2)}px`,
            "--lens": `${lensSize}px`,
            "--inset": `${inset}px`,
            "--say": say,
            "--say-hit": isOpen ? "auto" : "none",
          } as React.CSSProperties
        }
      >
        {/* Clickable search icon lens button */}
        <button
          type="button"
          data-no-liquid="true"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className={`sek-lens-btn absolute left-0 top-0 h-full flex items-center justify-center cursor-pointer z-10 transition-colors ${
            variant === "ghost"
              ? "text-[var(--text-2)] hover:text-[var(--text-1)] dark:text-[var(--text-dark-2)] dark:hover:text-white"
              : "text-black/65 hover:text-black dark:text-white/70 dark:hover:text-white"
          }`}
          style={{
            width: `${shutSize}px`,
            background: 'none',
            border: 0,
            padding: 0,
          }}
          aria-label={isOpen ? "Focus search field" : "Open search field"}
          title={isOpen ? "Search" : "Open search"}
        >
          <Search
            size={16}
            strokeWidth={1.5}
            className="transition-transform duration-200"
          />
        </button>

        {/* Input Field: slides out from behind the lens */}
        <input
          ref={inputRef}
          className="sek-field"
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={effectivePlaceholder}
          autoComplete="off"
          spellCheck={false}
          tabIndex={isOpen ? 0 : -1}
          style={{
            left: `${shutSize}px`,
            right: isOpen && value ? '32px' : '12px',
            width: `calc(100% - ${shutSize + (isOpen && value ? 32 : 12)}px)`,
            pointerEvents: isOpen ? 'auto' : 'none',
          }}
        />

        {/* Clear Button when open and value present */}
        {isOpen && value && value.length > 0 && (
          <button
            type="button"
            data-no-liquid="true"
            onClick={handleClear}
            className="sek-clear absolute right-[var(--s2,8px)] top-1/2 -translate-y-1/2 w-[var(--s5,20px)] h-[var(--s5,20px)] rounded-full flex items-center justify-center text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-black/[0.06] dark:hover:bg-white/10 transition-colors cursor-pointer z-20"
            title="Clear search"
            aria-label="Clear search"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        )}

        {/* Clickable Hit Target when shut */}
        {!isOpen && (
          <button
            type="button"
            data-no-liquid="true"
            className="sek-hit"
            onClick={(e) => {
              e.stopPropagation();
              handleOpen();
            }}
            aria-label="Open search field"
          />
        )}
      </div>
    </div>
  );
});

Seek.displayName = "Seek";

export default Seek;
