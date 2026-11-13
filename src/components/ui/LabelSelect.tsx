import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { useAtriumSelector } from '../../services/store';
import { enqueueLabelWrite, cancelLabelGeometryTask } from './labelGeometryQueue';

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

function computeSelectRingPaths(W: number, H: number, r: number, lw: number, isRtl: boolean) {
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

  return { lx, gapL, gapR, right, left };
}

export const LabelSelect: React.FC<LabelSelectProps> = ({
  field = 'Select',
  label: explicitLabel,
  value: controlledValue,
  options,
  onChange,
  placeholder,
  searchable = false,
  disabled = false,
  corner = 6,
  width = '100%',
  height = 40,
  className = '',
  id: customId,
  name,
  prefix,
}) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rightPathRef = useRef<SVGPathElement | null>(null);
  const leftPathRef = useRef<SVGPathElement | null>(null);
  const gapLPathRef = useRef<SVGPathElement | null>(null);
  const gapRPathRef = useRef<SVGPathElement | null>(null);
  const lab = useRef<HTMLLabelElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const generatedId = `lbs-${useId().replace(/:/g, '')}`;
  const id = customId || generatedId;
  const label = explicitLabel || field;

  const normalizedOptions: SelectOption[] = useMemo(
    () =>
      options.map((opt) => {
        if (typeof opt === 'string' || typeof opt === 'number') {
          return { value: opt, label: String(opt) };
        }
        return opt;
      }),
    [options]
  );

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(controlledValue) && String(controlledValue) !== ''
  );

  const language = useAtriumSelector((s) => s.language);
  const defaultPlaceholder = language === 'ar' ? 'اختر...' : language === 'fr' ? 'Sélectionner...' : 'Select...';
  const defaultSearchPlaceholder = language === 'ar' ? 'بحث في الخيارات...' : language === 'fr' ? 'Rechercher...' : 'Search options...';
  const noOptionsText = language === 'ar' ? 'لا توجد خيارات مطابقة' : language === 'fr' ? 'Aucune option trouvée' : 'No options found';

  const isRtl =
    language === 'ar' ||
    (typeof document !== 'undefined' && document.documentElement.dir === 'rtl') ||
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(label);
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(label);

  const H = height;
  const r = clamp(corner, 0, H / 2);
  const up = isOpen || selectedOption !== undefined;
  const initialW = Math.max(80, typeof width === 'number' ? width : 240);
  const lastGeomRef = useRef<{ W: number; lw: number }>({ W: initialW, lw: 48 });
  const measuredBoxWRef = useRef<number>(0);
  const measuredLabWRef = useRef<number>(0);

  const commitSvgPaths = useRef(() => {});
  commitSvgPaths.current = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const rawW = typeof width === 'number' ? width : measuredBoxWRef.current;
    if (rawW <= 0) return;
    const W = Math.max(80, Math.round(rawW));
    const lw = measuredLabWRef.current > 0 ? measuredLabWRef.current : lastGeomRef.current.lw;
    if (lastGeomRef.current.W === W && lastGeomRef.current.lw === lw && svg.getAttribute('viewBox') === `0 0 ${W} ${H}`) {
      return;
    }
    lastGeomRef.current = { W, lw };
    const paths = computeSelectRingPaths(W, H, r, lw, isRtl);

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    rightPathRef.current?.setAttribute('d', paths.right);
    leftPathRef.current?.setAttribute('d', paths.left);
    gapLPathRef.current?.setAttribute('d', paths.gapL);
    gapRPathRef.current?.setAttribute('d', paths.gapR);
  };

  const syncGeometry = useRef(() => {});
  syncGeometry.current = () => {
    const box = boxRef.current;
    const svg = svgRef.current;
    if (!box || !svg) return;

    const rawW = typeof width === 'number' ? width : box.offsetWidth;
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
    if (!box || typeof ResizeObserver === 'undefined') return;
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

  // Collision detection to flip upward if near viewport or dialog bottom
  useEffect(() => {
    if (isOpen && boxRef.current) {
      const rect = boxRef.current.getBoundingClientRect();
      const dialog = boxRef.current.closest('[role="dialog"]') as HTMLElement | null;
      const bottomLimit = dialog ? Math.min(window.innerHeight, dialog.getBoundingClientRect().bottom) : window.innerHeight;
      const topLimit = dialog ? Math.max(0, dialog.getBoundingClientRect().top) : 0;
      const spaceBelow = bottomLimit - rect.bottom;
      const spaceAbove = rect.top - topLimit;
      if (spaceBelow < 210 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen && (searchable || normalizedOptions.length >= 6)) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [isOpen, searchable, normalizedOptions.length]);

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
      e.stopPropagation();
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

  const initialPaths = useMemo(
    () => computeSelectRingPaths(initialW, H, r, lastGeomRef.current.lw, isRtl),
    [initialW, H, r, isRtl]
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

  return (
    <div
      ref={boxRef}
      className={`lbi ${className}`}
      data-up={Boolean(up)}
      data-focus={isOpen}
      data-filled={Boolean(selectedOption !== undefined)}
      data-has-prefix={Boolean(prefix)}
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
            '--lbi-x': `${initialPaths.lx}px`,
          } as React.CSSProperties
        }
      >
        <svg
          ref={svgRef}
          className="lbi-ring"
          width="100%"
          height={H}
          viewBox={`0 0 ${initialW} ${H}`}
          aria-hidden="true"
        >
          <path ref={rightPathRef} d={initialPaths.right} />
          <path ref={leftPathRef} d={initialPaths.left} />
          <path ref={gapLPathRef} className="lbi-gap" d={initialPaths.gapL} pathLength={1} />
          <path ref={gapRPathRef} className="lbi-gap" d={initialPaths.gapR} pathLength={1} />
        </svg>

        <label
          className="lbi-label pointer-events-none"
          htmlFor={id}
          ref={lab}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {labelSpans}
        </label>

        {prefix && (
          <div className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 z-10 flex items-center pointer-events-none text-neutral-400">
            {prefix}
          </div>
        )}

        <button
          type="button"
          id={id}
          data-no-liquid="true"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setIsOpen((prev) => !prev);
          }}
          className="w-full h-full flex items-center justify-between text-left rtl:text-right focus:outline-none cursor-pointer bg-transparent transition-opacity"
          style={{
            paddingInlineStart: prefix ? 38 : initialPaths.lx,
            paddingInlineEnd: Math.max(10, r),
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2 truncate pr-2 rtl:pr-0 rtl:pl-2">
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
              isOpen ? 'rotate-180 text-[#d4522f]' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div
            ref={popoverRef}
            className={`absolute left-0 right-0 z-50 rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
              openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            }`}
            style={{
              maxHeight: '230px',
            }}
          >
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
                    className="w-full h-7 pl-7 pr-7 rtl:pr-7 rtl:pl-7 text-xs bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-[#d4522f]"
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
                          ? 'bg-[#d4522f]/10 text-[#d4522f] font-semibold'
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
                          className="shrink-0 text-[#d4522f]"
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

