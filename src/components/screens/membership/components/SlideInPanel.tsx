import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { X, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { Sp, subscribeFrame, subscribeCleanup, wake } from '../motion/adherentsMotion';
import { computePanelMetrics } from '../motion/adherentsMath';
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
  // Panel Spring (pp: 0..100) — zero React re-renders per frame
  const ppRef = useRef<Sp | null>(null);
  const [rendered, setRendered] = useState<boolean>(isOpen);

  const scrimRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const storedOriginRef = useRef<HTMLElement | null>(null);
  const lastDrawKeyRef = useRef<string>('');
  const willChangeRef = useRef<boolean>(false);

  if (isOpen && !rendered) {
    setRendered(true);
  }

  // Initialize spring
  if (!ppRef.current) {
    ppRef.current = new Sp(0, 24);
  }

  const drawPanel = useCallback(() => {
    const pp = ppRef.current;
    if (!pp) return;
    const pm = computePanelMetrics(pp.x, pp.t);
    const txQ = Math.round(pm.translateX * 2) / 2;
    const opQ = Math.round(pm.scrimOpacity * 100) / 100;
    const vis = pm.visible ? 'visible' : 'hidden';
    const ptr = pp.t > 0 ? 'auto' : 'none';
    const key = `${vis}|${txQ}|${opQ}|${ptr}`;

    const isMoving = !pp.rest();
    if (isMoving !== willChangeRef.current) {
      willChangeRef.current = isMoving;
      if (panelRef.current) panelRef.current.style.willChange = isMoving ? 'transform' : '';
      if (scrimRef.current) scrimRef.current.style.willChange = isMoving ? 'opacity' : '';
    }

    if (key !== lastDrawKeyRef.current) {
      lastDrawKeyRef.current = key;
      if (panelRef.current) {
        panelRef.current.style.visibility = vis;
        panelRef.current.style.transform = `translate3d(${txQ}px, 0, 0)`;
      }
      if (scrimRef.current) {
        scrimRef.current.style.visibility = vis;
        scrimRef.current.style.opacity = String(opQ);
        scrimRef.current.style.pointerEvents = ptr;
      }
    }
  }, []);

  useLayoutEffect(() => {
    if (!rendered) return;
    const unsubDraw = subscribeFrame(drawPanel);
    const unsubClean = subscribeCleanup(() => {
      const pp = ppRef.current;
      if (pp && pp.t === 0 && pp.x < 1 && pp.rest()) {
        setRendered(false);
      }
    });
    drawPanel();
    return () => {
      unsubDraw();
      unsubClean();
    };
  }, [rendered, drawPanel]);

  // Sync open state
  useLayoutEffect(() => {
    const pp = ppRef.current;
    if (!pp) return;
    if (isOpen) {
      if (originElement) {
        storedOriginRef.current = originElement;
      }
      pp.setTarget(100);
      drawPanel();
      wake();
      const focusTimer = setTimeout(() => {
        closeBtnRef.current?.focus({ preventScroll: true });
      }, 40);
      return () => clearTimeout(focusTimer);
    } else {
      pp.setTarget(0);
      drawPanel();
      wake();
      if (storedOriginRef.current && storedOriginRef.current.isConnected) {
        storedOriginRef.current.focus({ preventScroll: true });
      }
    }
  }, [isOpen, originElement, drawPanel]);

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
      ppRef.current = null;
    };
  }, []);

  if (!rendered && !isOpen) return null;

  return (
    <>
      {/* 1. Backdrop Scrim */}
      <div
        ref={scrimRef}
        className="scrim fixed inset-0 z-[60] bg-[#1F1D1B]/38"
        style={{
          opacity: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
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
        data-sq="panel"
        data-sq-border="solid"
        className={`pnl fixed right-3.5 top-3.5 bottom-3.5 w-[560px] max-w-[calc(100vw-28px)] z-[61] bg-white dark:bg-[#262422] border-0 [--sq-stroke:var(--sq-stroke-pop)] flex flex-col overflow-hidden ${className}`}
        style={{
          visibility: 'hidden',
          transform: 'translate3d(620px, 0, 0)',
          contain: 'layout paint',
        }}
      >
        {/* Header (.ph) */}
        <div className="flex gap-4 items-start p-6 pb-4.5 border-b border-[var(--atr-divider)]">
          {avatar && (
            <div
              data-sq="tile-lg"
              data-sq-border="none"
              className="w-[68px] h-[68px] grid place-items-center text-white font-semibold t-dialog shrink-0 select-none"
              style={{ backgroundColor: avatar.bg }}
              aria-hidden="true"
            >
              {avatar.text}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2
              id="pnl-title"
              className="m-0 mb-2 font-semibold t-dialog leading-tight text-black dark:text-white truncate"
            >
              {title}
            </h2>
            {pills && <div className="flex gap-2 flex-wrap">{pills}</div>}
            {subtitle && (
              <span className="block mt-2 tabular-nums t-cap text-black/70 dark:text-white/75">
                {subtitle}
              </span>
            )}
          </div>

          {/* Navigation Controls (.pnav) */}
          <div className="flex gap-2 shrink-0">
            {onPrev && (
              <button
                type="button"
                disabled={!hasPrev}
                onClick={onPrev}
                aria-label="Adhérent précédent"
                className="w-[34px] h-[34px] rounded-full bg-[#F3EDE7] dark:bg-[#2B2825] grid place-items-center text-black dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:not-disabled:bg-[#d4522f]/12 transition-colors cursor-pointer"
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
                className="w-[34px] h-[34px] rounded-full bg-[#F3EDE7] dark:bg-[#2B2825] grid place-items-center text-black dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:not-disabled:bg-[#d4522f]/12 transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Fermer la fiche"
              className="w-[34px] h-[34px] rounded-full bg-[#F3EDE7] dark:bg-[#2B2825] grid place-items-center text-black dark:text-white hover:bg-[#d4522f]/12 transition-colors cursor-pointer"
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
        <div className="pf flex justify-between items-center px-6 py-4 border-t border-black/[0.045] dark:border-white/[0.06] bg-[#FBF8F5] dark:bg-[#1E1C1A]">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="border-0 bg-transparent text-[#c0283d] hover:text-[#91200E] dark:text-[#FF8D7A] font-semibold t-label flex items-center gap-2 py-2 px-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>{deleteLabel}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            data-sq="ctl"
            data-sq-border="none"
            onClick={onClose}
            className="h-[44px] px-7 border-0 bg-[var(--brand-fill,#C9461F)] hover:bg-[#b03b1b] text-white font-semibold t-label cursor-pointer transition-colors"
          >
            {closeLabel}
          </button>
        </div>
      </aside>
    </>
  );
};
