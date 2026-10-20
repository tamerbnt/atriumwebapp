import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useAtriumStore } from "../../services/store";

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
  onSearch?: (val: string) => void;
  autoFocusOnOpen?: boolean;
}

export const Seek: React.FC<SeekProps> = ({
  value,
  onChange,
  placeholder,
  className = "",
  openWidth = 260,
  shutSize = 40,
  onSearch,
  autoFocusOnOpen = true,
}) => {
  const { language } = useAtriumStore();
  const defaultPlaceholder = language === 'ar' ? 'بحث...' : language === 'fr' ? 'Rechercher...' : 'Search...';
  const effectivePlaceholder = placeholder !== undefined ? placeholder : defaultPlaceholder;
  const [isOpen, setIsOpen] = useState(Boolean(value && value.length > 0));
  const [isPress, setIsPress] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const busyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If value is set externally, open automatically
  useEffect(() => {
    if (value && value.length > 0) {
      setIsOpen(true);
    }
  }, [value]);

  // Click outside to collapse if empty
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!value || value.trim().length === 0) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [value]);

  // Handle opening
  const handleOpen = () => {
    setIsOpen(true);
    if (autoFocusOnOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
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

    // Pulse busy state on typing
    setIsBusy(true);
    if (busyTimerRef.current) clearTimeout(busyTimerRef.current);
    busyTimerRef.current = setTimeout(() => {
      setIsBusy(false);
    }, 280);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    inputRef.current?.focus();
  };

  // Dimensions
  const currentWidth = isOpen ? openWidth : shutSize;
  const lensSize = 18;
  const inset = Math.max(8, Math.round((shutSize - lensSize) / 2));
  const say = isOpen ? 1 : 0;

  return (
    <div
      ref={containerRef}
      className={`sek ${className}`}
      data-open={isOpen ? "true" : "false"}
      data-press={isPress ? "true" : "false"}
      data-busy={isBusy ? "true" : "false"}
      style={
        {
          "--frame": `${isOpen ? openWidth : shutSize}px`,
          "--frameh": `${shutSize}px`,
        } as React.CSSProperties
      }
    >
      <div
        className="sek-skin"
        onMouseDown={() => setIsPress(true)}
        onMouseUp={() => setIsPress(false)}
        style={
          {
            "--w": `${currentWidth}px`,
            "--shut": `${shutSize}px`,
            "--sek-r": `${shutSize / 2}px`,
            "--lens": `${lensSize}px`,
            "--inset": `${inset}px`,
            "--say": say,
            "--say-hit": isOpen ? "auto" : "none",
          } as React.CSSProperties
        }
      >
        {/* The 18x18 SVG Search Lens that stays in place */}
        <svg
          className="sek-lens"
          viewBox="0 0 18 18"
          aria-hidden="true"
        >
          <circle cx="7.5" cy="7.5" r="5" />
          <line x1="11.5" y1="11.5" x2="16" y2="16" />
        </svg>

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
        />

        {/* Clear Button when open and value present */}
        {isOpen && value && value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            title="Clear search"
          >
            <X size={13} strokeWidth={2.2} />
          </button>
        )}

        {/* Clickable Hit Target when shut */}
        {!isOpen && (
          <button
            type="button"
            className="sek-hit"
            onClick={handleOpen}
            aria-label="Open search field"
          />
        )}
      </div>
    </div>
  );
};

export default Seek;
