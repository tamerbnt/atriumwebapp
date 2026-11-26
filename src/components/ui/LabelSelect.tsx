import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useAtriumSelector } from '../../services/store';
import { enqueueLabelWrite, cancelLabelGeometryTask } from './labelGeometryQueue';
import { squircleNotchedRingPaths, squirclePath } from '@/atrium/motion/shapes';
import { LivePopoverPanel, popoverClasses } from './live/LivePopoverPanel';

export interface SelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
  tooltip?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface LabelSelectProps {
  field?: string;
  label?: string;
  value?: string | number;
  options: (SelectOption | string)[];
  onChange: (val: string) => void;
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
const S = 0.86;
const IN = 0.75;

function computeSelectRingPaths(W: number, H: number, r: number, lw: number, isRtl: boolean) {
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

export const LabelSelect: React.FC<LabelSelectProps> = ({
  field = '',
  label: explicitLabel,
  value: controlledValue,
  options,
  onChange,
  placeholder,
  searchable = false,
  disabled = false,
  corner = 12,
  width = '100%',
  height = 40,
  className = '',
  id: customId,
  name,
  prefix,
}) => {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const bgRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rightPathRef = useRef<SVGPathElement | null>(null);
  const leftPathRef = useRef<SVGPathElement | null>(null);
  const gapLPathRef = useRef<SVGPathElement | null>(null);
  const gapRPathRef = useRef<SVGPathElement | null>(null);
  const lab = useRef<HTMLLabelElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const generatedId = `lbs-${useId().replace(/:/g, '')}`;
  const id = customId || generatedId;
  const label = explicitLabel || field || '';

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
    (opt) => String(opt.value) === String(controlledValue) && String(controlledValue ?? '') !== ''
  );

  const language = useAtriumSelector((s) => s.language);
  const defaultPlaceholder = language === 'ar' ? 'اختر...' : language === 'fr' ? 'Sélectionner...' : 'Select...';
  const defaultSearchPlaceholder = language === 'ar' ? 'بحث في الخيارات...' : language === 'fr' ? 'Rechercher...' : 'Search options...';
  const noOptionsText = language === 'ar' ? 'لا توجد خيارات مطابقة' : language === 'fr' ? 'Aucune option trouvée' : 'No options found';

  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(label);
  const isRtl =
    language === 'ar' ||
    (typeof document !== 'undefined' && document.documentElement.dir === 'rtl') ||
    hasArabic;

  const H = height;
  const r = clamp(corner, 0, H / 2);
  const up = isOpen || selectedOption !== undefined;
  const showSearch = searchable || normalizedOptions.length >= 6;
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

    if (bgRef.current && paths.bg) {
      const clipStr = `path('${paths.bg}')`;
      bgRef.current.style.clipPath = clipStr;
      (bgRef.current.style as any).webkitClipPath = clipStr;
    }
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

  // Focus search input when searchable popover opens
  useEffect(() => {
    if (isOpen && showSearch) {
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 45);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, showSearch]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelect = (val: string | number) => {
    handleClose();
    onChange(String(val));
    triggerRef.current?.focus({ preventScroll: true });
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
      data-rtl={isRtl ? 'true' : undefined}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        '--lbi-scale': String(S),
        '--lbi-lift': `${H / 2}px`,
      } as React.CSSProperties}
    >
      <div
        className="lbi-box"
        style={
          {
            width: typeof width === 'number' ? `${width}px` : '100%',
            height: H,
            '--lbi-x': `${initialPaths.lx}px`,
          } as React.CSSProperties
        }
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
          height={H}
          viewBox={`0 0 ${initialW} ${H}`}
          aria-hidden="true"
        >
          <path ref={rightPathRef} d={initialPaths.right} />
          <path ref={leftPathRef} d={initialPaths.left} />
          <path ref={gapLPathRef} className="lbi-gap" d={initialPaths.gapL} pathLength={1} />
          <path ref={gapRPathRef} className="lbi-gap" d={initialPaths.gapR} pathLength={1} />
        </svg>

        {label && (
          <label
            className="lbi-label pointer-events-none z-[2]"
            htmlFor={id}
            ref={lab}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {labelSpans}
          </label>
        )}

        {prefix && (
          <div className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 z-10 flex items-center pointer-events-none text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
            {prefix}
          </div>
        )}

        <button
          ref={triggerRef}
          type="button"
          id={id}
          data-no-liquid="true"
          disabled={disabled}
          title={selectedOption?.tooltip || selectedOption?.sublabel || selectedOption?.label}
          onClick={() => {
            if (!disabled) setIsOpen((prev) => !prev);
          }}
          className="relative z-[1] w-full h-full flex items-center justify-between text-start focus:outline-none cursor-pointer bg-transparent transition-opacity"
          style={{
            paddingInlineStart: prefix ? 38 : initialPaths.lx,
            paddingInlineEnd: Math.max(10, r),
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-[var(--s2,8px)] truncate pe-[var(--s2,8px)]">
            {selectedOption?.icon && (
              <span className="shrink-0 text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
                {selectedOption.icon}
              </span>
            )}
            <span
              className={`t-label truncate ${
                selectedOption
                  ? 'text-[var(--text-1)] dark:text-white'
                  : 'text-[var(--text-2)] dark:text-[var(--text-dark-2)]'
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
            size={16}
            data-atr-chev=""
            style={{ transition: 'none' }}
            className="shrink-0 text-[var(--text-2)] dark:text-[var(--text-dark-2)]"
          />
        </button>

        {name && <input type="hidden" name={name} value={controlledValue !== undefined ? String(controlledValue) : ''} />}

        <LivePopoverPanel
          anchor={triggerRef.current}
          open={isOpen}
          role="listbox"
          aria-label={label || placeholder || 'Select'}
          placement={isRtl ? 'bottom-end' : 'bottom-start'}
          width="anchor"
          focus={showSearch ? null : 'selected'}
          className="max-h-[min(55vh,320px)]"
          onRequestClose={handleClose}
        >
          {showSearch && (
            <div className="pb-[var(--s2,8px)] mb-[var(--s1,4px)] border-b border-[var(--atr-line)]">
              <div className="relative flex items-center rounded-[var(--r-ctl-sm,10px)] bg-[#F5F1EC] dark:bg-[#292624] focus-within:bg-white dark:focus-within:bg-[#2E2B28] border border-black/[0.06] dark:border-white/[0.08] transition-colors">
                <Search
                  size={14}
                  className="absolute start-3 text-[var(--text-3)] pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredOptions.length > 0 && !filteredOptions[0].disabled) {
                      e.preventDefault();
                      handleSelect(filteredOptions[0].value);
                    }
                  }}
                  placeholder={defaultSearchPlaceholder}
                  className="w-full h-[var(--btn-sm-h,32px)] ps-8 pe-8 t-body bg-transparent border-0 text-[var(--text-1)] dark:text-white placeholder:text-[var(--text-3)] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    data-no-liquid="true"
                    onClick={() => setSearchQuery('')}
                    className="absolute end-2 text-[var(--text-2)] hover:text-[var(--text-1)] dark:text-[var(--text-dark-2)] dark:hover:text-white p-1 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="px-3 py-3 text-center t-small text-[var(--text-2)] dark:text-[var(--text-dark-2)]">
              {noOptionsText}
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected =
                String(opt.value) === String(controlledValue) && String(controlledValue ?? '') !== '';
              const desc = opt.sublabel ?? opt.tooltip;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-atr-item=""
                  tabIndex={-1}
                  disabled={opt.disabled}
                  title={opt.tooltip || opt.sublabel || opt.label}
                  className={popoverClasses.item}
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <span className={popoverClasses.text}>
                    <b>{opt.label}</b>
                    {desc && <small>{desc}</small>}
                  </span>
                  {isSelected && <i className={popoverClasses.mark} aria-hidden="true" />}
                </button>
              );
            })
          )}
        </LivePopoverPanel>
      </div>
    </div>
  );
};

export default LabelSelect;
