import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { useAtriumStore } from '../../services/store';

export interface SelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface LabelSelectProps {
  field?: string;
  label?: string;
  value?: string | number;
  options: (SelectOption | string)[];
  onChange: (val: any) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  required?: boolean;
  corner?: number;
  width?: number | string;
  height?: number;
  className?: string;
  id?: string;
  name?: string;
  prefix?: React.ReactNode;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const S = 0.82;
const IN = 0.75;

export const LabelSelect: React.FC<LabelSelectProps> = ({
  field = 'Select',
  label: explicitLabel,
  value: controlledValue,
  options,
  onChange,
  placeholder,
  searchable = false,
  disabled = false,
  required = false,
  corner = 12,
  width = '100%',
  height = 40,
  className = '',
  id: customId,
  name,
  prefix,
}) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [measuredW, setMeasuredW] = useState<number>(
    typeof width === 'number' ? width : 240
  );

  const generatedId = `lbs-${useId().replace(/:/g, '')}`;
  const id = customId || generatedId;
  const label = explicitLabel || field;

  // Normalize options into SelectOption shape
  const normalizedOptions: SelectOption[] = options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt) };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(controlledValue) && String(controlledValue) !== ''
  );

  // ResizeObserver for dynamic width
  useLayoutEffect(() => {
    if (typeof width === 'number') {
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
    if (typeof width === 'number' || !boxRef.current) return;
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

  // Notch measurement
  const lab = useRef<HTMLLabelElement | null>(null);
  const [lw, setLw] = useState(48);
  useLayoutEffect(() => {
    if (lab.current) setLw(lab.current.offsetWidth);
  }, [label]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        boxRef.current &&
        !boxRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Intelligent collision detection to flip upward if near viewport/modal bottom
  useEffect(() => {
    if (isOpen && boxRef.current) {
      const rect = boxRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220 && rect.top > 220) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen && (searchable || normalizedOptions.length >= 6)) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 40);
    }
  }, [isOpen, searchable, normalizedOptions.length]);

  // Filter options based on query
  const filteredOptions = normalizedOptions.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  });

  const handleSelect = (val: string | number) => {
    setIsOpen(false);
    setSearchQuery('');
    // Emit hybrid compatible with (val: string) and (e: ChangeEvent)
    const hybrid: any = new String(val);
    hybrid.target = { value: val, name: name || id };
    hybrid.currentTarget = { value: val, name: name || id };
    hybrid.value = val;
    hybrid.valueOf = () => val;
    hybrid.toString = () => String(val);
    onChange(hybrid);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex] && !filteredOptions[highlightedIndex].disabled) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    }
  };

  const W = Math.max(80, measuredW);
  const H = height;
  const r = clamp(corner, 0, H / 2);
  const up = isOpen || selectedOption !== undefined;

  const { language } = useAtriumStore();
  const defaultPlaceholder = language === 'ar' ? 'اختر...' : language === 'fr' ? 'Sélectionner...' : 'Select...';
  const defaultSearchPlaceholder = language === 'ar' ? 'بحث في الخيارات...' : language === 'fr' ? 'Rechercher...' : 'Search options...';
  const noOptionsText = language === 'ar' ? 'لا توجد خيارات مطابقة' : language === 'fr' ? 'Aucune option trouvée' : 'No options found';

  const isRtl =
    language === 'ar' ||
    (typeof document !== 'undefined' && document.documentElement.dir === 'rtl') ||
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(label);
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(label);

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

  const right =
    r > 0
      ? `M${x1},${IN} L${W - r},${IN} A${a},${a} 0 0 1 ${R},${r} L${R},${H - r} A${a},${a} 0 0 1 ${W - r},${B} L${mid},${B}`
      : `M${x1},${IN} L${R},${IN} L${R},${B} L${mid},${B}`;

  const left =
    r > 0
      ? `M${x0},${IN} L${r},${IN} A${a},${a} 0 0 0 ${IN},${r} L${IN},${H - r} A${a},${a} 0 0 0 ${r},${B} L${mid},${B}`
      : `M${x0},${IN} L${IN},${IN} L${IN},${B} L${mid},${B}`;

  return (
    <div
      ref={boxRef}
      className={`lbi ${className}`}
      data-up={Boolean(up)}
      data-focus={isOpen}
      data-filled={Boolean(selectedOption !== undefined)}
      style={{ width: typeof width === 'number' ? `${width}px` : width }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="lbi-box"
        style={
          {
            width: typeof width === 'number' ? `${width}px` : '100%',
            height: H,
            borderRadius: r,
            '--lbi-x': `${lx}px`,
          } as React.CSSProperties
        }
      >
        {/* Animated Notched SVG Border */}
        <svg
          className="lbi-ring"
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          aria-hidden="true"
        >
          <path d={right} />
          <path d={left} />
          <path className="lbi-gap" d={gapL} pathLength={1} />
          <path className="lbi-gap" d={gapR} pathLength={1} />
        </svg>

        {/* Floating Kinetic Label with Hopping Letters/Words */}
        <label
          className="lbi-label pointer-events-none"
          htmlFor={id}
          ref={lab}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {hasArabic || isRtl ? (
            label.split(/(\s+)/).map((segment, i) => (
              <span key={i} style={{ '--i': i, display: 'inline-block' } as React.CSSProperties}>
                {segment === ' ' ? '\u00A0' : segment}
              </span>
            ))
          ) : (
            [...label].map((ch, i) => (
              <span key={i} style={{ '--i': i } as React.CSSProperties}>
                {ch === ' ' ? '\u00A0' : ch}
              </span>
            ))
          )}
        </label>

        {/* Interactive Custom Button Trigger */}
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => {
            if (!disabled) setIsOpen((prev) => !prev);
          }}
          className="w-full h-full flex items-center justify-between text-left rtl:text-right focus:outline-none cursor-pointer bg-transparent transition-opacity"
          style={{
            paddingInlineStart: prefix ? lx + 16 : lx,
            paddingInlineEnd: Math.max(10, r),
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2 truncate pr-2 rtl:pr-0 rtl:pl-2">
            {prefix && (
              <span className="shrink-0 text-neutral-400">{prefix}</span>
            )}
            {selectedOption?.icon && (
              <span className="shrink-0 text-neutral-500">
                {selectedOption.icon}
              </span>
            )}
            <span
              className={`text-[13px] font-medium truncate ${
                selectedOption
                  ? 'text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-400'
              }`}
            >
              {selectedOption
                ? selectedOption.label
                : up
                ? placeholder || defaultPlaceholder
                : ''}
            </span>
          </div>

          <ChevronDown
            size={15}
            className={`shrink-0 text-neutral-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#C4785A]' : ''
            }`}
          />
        </button>

        {/* Floating Spatial Popover Menu */}
        {isOpen && (
          <div
            ref={popoverRef}
            className={`absolute left-0 right-0 z-50 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-xl overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${
              openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            }`}
            style={{
              maxHeight: '230px',
            }}
          >
            {/* Inline Quick Search if searchable or list has >= 6 items */}
            {(searchable || normalizedOptions.length >= 6) && (
              <div className="p-2 border-b border-neutral-100 dark:border-zinc-800 bg-neutral-50/50 dark:bg-zinc-900/50">
                <div className="relative flex items-center">
                  <Search
                    size={13}
                    className="absolute left-2.5 rtl:left-auto rtl:right-2.5 text-neutral-400 pointer-events-none"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHighlightedIndex(0);
                    }}
                    placeholder={defaultSearchPlaceholder}
                    className="w-full h-7 pl-7 pr-7 rtl:pr-7 rtl:pl-7 text-xs bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#C4785A]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 rtl:right-auto rtl:left-2 text-neutral-400 hover:text-neutral-600 p-0.5 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List */}
            <ul
              className="py-1 max-h-48 overflow-y-auto focus:outline-none text-xs"
              role="listbox"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-3.5 py-3 text-center text-neutral-400 italic">
                  {noOptionsText}
                </li>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected =
                    String(opt.value) === String(controlledValue);
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <li
                      key={String(opt.value)}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        if (!opt.disabled) handleSelect(opt.value);
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                        opt.disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : isSelected
                          ? 'bg-[#C4785A]/10 text-[#C4785A] font-semibold'
                          : isHighlighted
                          ? 'bg-neutral-100 dark:bg-zinc-800 text-neutral-900 dark:text-neutral-100'
                          : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {opt.icon && (
                          <span className="shrink-0">{opt.icon}</span>
                        )}
                        <div className="truncate">
                          <div className="truncate font-medium">{opt.label}</div>
                          {opt.sublabel && (
                            <div className="text-[10px] text-neutral-400 truncate">
                              {opt.sublabel}
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <Check
                          size={13}
                          className="shrink-0 text-[#C4785A]"
                          strokeWidth={2.5}
                        />
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabelSelect;
