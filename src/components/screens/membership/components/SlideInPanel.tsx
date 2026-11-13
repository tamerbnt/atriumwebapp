import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { clamp, Sp, wake } from '../motion/adherentsMotion';
import { LiveSegmentedControl } from '../../../ui/live/LiveSegmentedControl';

export interface SlideInTab {
  id: string;
  label: string;
}

export interface SlideInPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  avatar?: {
    text: string;
    bg: string;
  };
  pills?: React.ReactNode;
  tabs?: SlideInTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  deleteLabel?: string;
  onDelete?: () => void;
  closeLabel?: string;
  originElement?: HTMLElement | null;
  children: React.ReactNode;
  className?: string;
}

export const SlideInPanel: React.FC<SlideInPanelProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  avatar,
  pills,
  tabs = [],
  activeTab,
  onTabChange,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  deleteLabel = 'Supprimer adhérent',
  onDelete,
  closeLabel = 'Fermer',
  originElement,
  children,
  className = '',
}) => {
  // Panel Spring (pp: 0..100)
  const ppRef = useRef<Sp | null>(null);
  const ixRef = useRef<Sp | null>(null); // Tab indicator left spring
  const iwRef = useRef<Sp | null>(null); // Tab indicator width spring

  const [ppVal, setPpVal] = useState<number>(0);
  const [indLeft, setIndLeft] = useState<number>(0);
  const [indWidth, setIndWidth] = useState<number>(0);

  const panelRef = useRef<HTMLElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const storedOriginRef = useRef<HTMLElement | null>(null);

  // Initialize springs
  if (!ppRef.current) {
    ppRef.current = new Sp(0, 24);
    ixRef.current = new Sp(0, 26);
    iwRef.current = new Sp(0, 26);
  }

  // Subscribe to springs
  useEffect(() => {
    const pp = ppRef.current!;
    const ix = ixRef.current!;
    const iw = iwRef.current!;

    const unsubPp = pp.subscribe((v) => setPpVal(v));
    const unsubIx = ix.subscribe((v) => setIndLeft(v));
    const unsubIw = iw.subscribe((v) => setIndWidth(v));

    return () => {
      unsubPp();
      unsubIx();
      unsubIw();
    };
  }, []);

  // Sync open state
  useEffect(() => {
    const pp = ppRef.current!;
    if (isOpen) {
      if (originElement) {
        storedOriginRef.current = originElement;
      }
      pp.setTarget(100);
      // Accessibility: focus close button on open
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 40);
    } else {
      pp.setTarget(0);
      if (storedOriginRef.current && storedOriginRef.current.isConnected) {
        storedOriginRef.current.focus();
      }
    }
  }, [isOpen, originElement]);

  // Sync tab indicator springs
  useEffect(() => {
    if (!tabsContainerRef.current || !activeTab) return;
    const activeBtn = tabsContainerRef.current.querySelector(
      `[data-tab-id="${activeTab}"]`
    ) as HTMLElement | null;

    if (activeBtn) {
      const targetLeft = activeBtn.offsetLeft;
      const targetWidth = activeBtn.offsetWidth;

      const ix = ixRef.current!;
      const iw = iwRef.current!;
      ix.t = targetLeft;
      iw.t = targetWidth;

      // Snap indicator on first open
      if (ppRef.current && ppRef.current.x < 1) {
        ix.snap();
        iw.snap();
      } else {
        wake();
      }
    }
  }, [activeTab, isOpen]);

  // Focus trap and keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Esc closes panel
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      // 2. Arrow Up / Down navigates between records
      const isInput = /^(INPUT|TEXTAREA|SELECT)$/.test(
        (document.activeElement?.tagName || '').toUpperCase()
      );
      if (!isInput) {
        if (e.key === 'ArrowUp' && hasPrev && onPrev) {
          e.preventDefault();
          onPrev();
          return;
        }
        if (e.key === 'ArrowDown' && hasNext && onNext) {
          e.preventDefault();
          onNext();
          return;
        }
      }

      // 3. Tab focus trap
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(
          (el) => !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1' && el.offsetParent !== null
        );

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, hasPrev, hasNext, onPrev, onNext]);

  // Clean up springs on unmount
  useEffect(() => {
    return () => {
      ppRef.current?.destroy();
      ixRef.current?.destroy();
      iwRef.current?.destroy();
      ppRef.current = null;
      ixRef.current = null;
      iwRef.current = null;
    };
  }, []);

  // Panel slide interpolation:
  // translateX = (1 - pq) * 620px
  // pq clamped to 1.08 allows small overshoot bounce
  const pq = clamp(ppVal / 100, 0, 1.08);
  const isVisible = ppVal >= 1 || isOpen;
  const panelTransform = `translateX(${(1 - pq) * 620}px)`;
  const scrimOpacity = clamp(pq, 0, 1);

  if (!isVisible && !isOpen) return null;

  return (
    <>
      {/* 1. Backdrop Scrim */}
      <div
        className="scrim fixed inset-0 z-[60] bg-[#1F1D1B]/38 backdrop-blur-[6px] transition-opacity duration-150"
        style={{
          opacity: scrimOpacity,
          visibility: isVisible ? 'visible' : 'hidden',
          pointerEvents: isVisible && ppVal > 10 ? 'auto' : 'none',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Slide-in Island Panel (.pnl) */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        aria-labelledby="pnl-title"
        className={`pnl fixed right-3.5 top-3.5 bottom-3.5 w-[560px] max-w-[calc(100vw-28px)] z-[61] rounded-[30px] bg-white dark:bg-[#1C1B1A] flex flex-col shadow-[-20px_0_60px_rgba(27,25,23,0.22)] border border-[#E6DED6] dark:border-[#3A3734] overflow-hidden ${className}`}
        style={{
          visibility: isVisible ? 'visible' : 'hidden',
          transform: panelTransform,
        }}
      >
        {/* Header (.ph) */}
        <div className="flex gap-4 items-start p-6 pb-4.5 border-b border-[#E6DED6]/60 dark:border-[#3A3734]">
          {avatar && (
            <div
              className="w-[68px] h-[68px] rounded-[22px] grid place-items-center text-white font-bold text-[28px] shrink-0 select-none shadow-sm"
              style={{ backgroundColor: avatar.bg }}
              aria-hidden="true"
            >
              {avatar.text}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2
              id="pnl-title"
              className="m-0 mb-2 font-bold text-[26px] leading-tight text-black dark:text-white tracking-tight truncate"
            >
              {title}
            </h2>
            {pills && <div className="flex gap-1.5 flex-wrap">{pills}</div>}
            {subtitle && (
              <span className="block mt-2 font-mono text-[11px] text-black/70 dark:text-white/75">
                {subtitle}
              </span>
            )}
          </div>

          {/* Navigation Controls (.pnav) */}
          <div className="flex gap-1.5 shrink-0">
            {onPrev && (
              <button
                type="button"
                disabled={!hasPrev}
                onClick={onPrev}
                aria-label="Adhérent précédent"
                className="w-[34px] h-[34px] rounded-full border border-[#E6DED6] dark:border-[#3A3734] bg-white dark:bg-[#262422] grid place-items-center text-black dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:not-disabled:bg-[#d4522f]/12 transition-colors cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            )}
            {onNext && (
              <button
                type="button"
                disabled={!hasNext}
                onClick={onNext}
                aria-label="Adhérent suivant"
                className="w-[34px] h-[34px] rounded-full border border-[#E6DED6] dark:border-[#3A3734] bg-white dark:bg-[#262422] grid place-items-center text-black dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:not-disabled:bg-[#d4522f]/12 transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Fermer la fiche"
              className="w-[34px] h-[34px] rounded-full border border-[#E6DED6] dark:border-[#3A3734] bg-white dark:bg-[#262422] grid place-items-center text-black dark:text-white hover:bg-[#d4522f]/12 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Atrium Branded Switcher Toggle (.ptabs) */}
        {tabs.length > 0 && (
          <div className="mx-6 my-2.5">
            <LiveSegmentedControl
              size="md"
              className="w-full flex [&>button]:flex-1"
              options={tabs.map((tab) => ({ value: tab.id, label: tab.label }))}
              value={activeTab}
              onValueChange={(val) => onTabChange?.(val)}
              aria-label="Navigation onglets"
            />
          </div>
        )}

        {/* Panel Scrollable Body (.pb) */}
        <div
          role="tabpanel"
          className="pb flex-1 overflow-y-auto px-6 py-2 pb-5 space-y-4"
          style={{ scrollbarWidth: 'thin' }}
        >
          {children}
        </div>

        {/* Panel Footer (.pf) */}
        <div className="pf flex justify-between items-center px-6 py-4 border-t border-[#E6DED6] dark:border-[#3A3734] bg-[#FBF8F5] dark:bg-[#151413]">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="border-0 bg-transparent text-[#c0283d] hover:text-[#91200E] dark:text-[#FF8D7A] font-semibold text-[13px] flex items-center gap-2 py-2 px-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>{deleteLabel}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="h-[44px] px-7 border-0 rounded-[12px] bg-[#d4522f] hover:bg-[#b03b1b] text-white font-semibold text-[14px] shadow-sm cursor-pointer transition-colors"
          >
            {closeLabel}
          </button>
        </div>
      </aside>
    </>
  );
};
