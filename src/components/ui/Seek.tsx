import React, { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useAtriumSelector } from "../../services/store";

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
  const language = useAtriumSelector((s) => s.language);
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
      const target = e.target as Node | null;
      if (!target || !document.contains(target)) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
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
        className={`sek-skin ${!isOpen ? 'cursor-pointer' : ''}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.sek-clear')) return;
          if (!isOpen) {
            handleOpen();
          } else {
            inputRef.current?.focus();
          }
        }}
        onMouseDown={() => setIsPress(true)}
        onMouseUp={() => setIsPress(false)}
        style={
          {
            "--w": `${currentWidth}px`,
            "--shut": `${shutSize}px`,
            "--sek-r": `${Math.round(shutSize / 2)}px`,
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
          className="sek-lens-btn absolute left-0 top-0 h-full flex items-center justify-center cursor-pointer z-10 text-black/65 hover:text-black dark:text-white/70 dark:hover:text-white transition-colors"
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
            size={Math.max(16, Math.round(shutSize * 0.44))}
            strokeWidth={2.2}
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
            right: isOpen && value ? '34px' : '14px',
            width: `calc(100% - ${shutSize + (isOpen && value ? 34 : 14)}px)`,
            pointerEvents: isOpen ? 'auto' : 'none',
          }}
        />

        {/* Clear Button when open and value present */}
        {isOpen && value && value.length > 0 && (
          <button
            type="button"
            data-no-liquid="true"
            onClick={handleClear}
            className="sek-clear absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-black/55 hover:text-black hover:bg-black/[0.06] dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer z-20"
            title="Clear search"
            aria-label="Clear search"
          >
            <X size={13} strokeWidth={2.2} />
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
};

export default Seek;
