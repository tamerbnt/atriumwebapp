import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { Sp, TUNES, subscribeFrame, wake } from './kineticMotion';
import { clamp, computePanelMetrics } from './kineticMath';

export interface KineticInspectorTab {
  id: string;
  label: string;
}

export interface KineticSlideOverInspectorProps<T = any> {
  isOpen: boolean;
  item: T | null;
  allItems: readonly T[];
  keyExtractor: (item: T) => string;
  openerElement?: HTMLElement | null;
  language?: string;
  title: string;
  subtitle?: string;
  avatarText?: string;
  avatarColor?: string;
  branchName?: string;
  categoryLabel?: string;
  statusLabel?: string;
  statusClassName?: string;
  headerPills?: React.ReactNode;
  tabs?: KineticInspectorTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onClose: () => void;
  onSelectItem?: (item: T) => void;
  onDelete?: (item: T) => void;
  holdToDelete?: boolean;
  deleteLabel?: string;
  closeLabel?: string;
  renderBody: (item: T, activeTab: string, entranceEpoch: number) => React.ReactNode;
}

function KineticSlideOverInspectorInner<T>({
  isOpen,
  item,
  allItems,
  keyExtractor,
  openerElement,
  language = 'fr',
  title,
  subtitle,
  avatarText,
  avatarColor = '#d4522f',
  branchName,
  categoryLabel,
  statusLabel,
  statusClassName,
  headerPills,
  tabs = [],
  activeTab: controlledTab,
  onTabChange,
  onClose,
  onSelectItem,
  onDelete,
  holdToDelete = true,
  deleteLabel,
  closeLabel,
  renderBody,
}: KineticSlideOverInspectorProps<T>) {
  const [internalTab, setInternalTab] = useState<string>(tabs[0]?.id || 'overview');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = useCallback(
    (tabId: string) => {
      setInternalTab(tabId);
      onTabChange?.(tabId);
    },
    [onTabChange]
  );

  const retainedRef = useRef<T | null>(item);
  if (item) {
    retainedRef.current = item;
  }
  const activeItem = item || retainedRef.current;

  const scrimRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const ptabsRef = useRef<HTMLDivElement | null>(null);
  const ptabsWidthRef = useRef<number>(500);
  const pindRef = useRef<HTMLElement | null>(null);
  const tabBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const holdFillRef = useRef<HTMLSpanElement | null>(null);
  const holdLabelRef = useRef<HTMLSpanElement | null>(null);
  const holdTextWrapRef = useRef<HTMLSpanElement | null>(null);

  const openerRef = useRef<HTMLElement | null>(null);
  const isHoldingRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const ppRef = useRef<Sp | null>(null);
  const ixRef = useRef<Sp | null>(null);
  const iwRef = useRef<Sp | null>(null);
  const holdRef = useRef<Sp | null>(null);

  if (!ppRef.current) {
    ppRef.current = new Sp(0, TUNES.panel);
    ixRef.current = new Sp(0, TUNES.tabIndicator);
    iwRef.current = new Sp(0, TUNES.tabIndicator);
    holdRef.current = new Sp(0, 22);
  }

  const wasOpenRef = useRef(false);
  const prevItemIdRef = useRef<string | null>(null);
  const prevTabRef = useRef<string>(activeTab);
  const entranceEpochRef = useRef(0);

  {
    const curId = activeItem ? keyExtractor(activeItem) : null;
    const justOpened = isOpen && !wasOpenRef.current;
    const switchedItem = isOpen && curId !== prevItemIdRef.current;
    const switchedTab = isOpen && activeTab !== prevTabRef.current;
    if (justOpened || switchedItem || switchedTab) {
      entranceEpochRef.current += 1;
    }
    wasOpenRef.current = isOpen;
    prevItemIdRef.current = curId;
    prevTabRef.current = activeTab;
  }
  const entranceEpoch = entranceEpochRef.current;

  const lastPanelKeyRef = useRef<string>('');
  const lastIndKeyRef = useRef<string>('');
  const lastHoldQRef = useRef<number>(-1);
  const panelWillChangeRef = useRef<boolean>(false);
  const indWillChangeRef = useRef<boolean>(false);

  const defaultHoldIdle =
    deleteLabel ||
    (language === 'ar'
      ? 'اضغط مطولاً للحذف'
      : language === 'fr'
      ? 'Maintenir pour supprimer'
      : 'Hold to delete');
  const defaultHoldBusy =
    language === 'ar' ? 'استمر...' : language === 'fr' ? 'Maintenez…' : 'Keep holding…';

  const drawPanel = useCallback(() => {
    const pp = ppRef.current;
    const ix = ixRef.current;
    const iw = iwRef.current;
    const hold = holdRef.current;
    if (!pp || !ix || !iw || !hold) return;

    const pm = computePanelMetrics(pp.x, pp.t);
    const txQ = Math.round(pm.translateX * 2) / 2;
    const opQ = Math.round(pm.scrimOpacity * 100) / 100;
    const vis = pm.visible ? 'visible' : 'hidden';
    const ptr = pp.t > 0 ? 'auto' : 'none';
    const panelKey = `${vis}|${txQ}|${opQ}|${ptr}`;

    const isPanelMoving = !pp.rest();
    if (isPanelMoving !== panelWillChangeRef.current) {
      panelWillChangeRef.current = isPanelMoving;
      if (panelRef.current) panelRef.current.style.willChange = isPanelMoving ? 'transform' : '';
      if (scrimRef.current) scrimRef.current.style.willChange = isPanelMoving ? 'opacity' : '';
    }

    if (panelKey !== lastPanelKeyRef.current) {
      lastPanelKeyRef.current = panelKey;
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

    const ixQ = Math.round(ix.x * 2) / 2;
    const iwQ = Math.round(Math.max(0, iw.x) * 2) / 2;
    const tabsW = ptabsWidthRef.current || 500;
    const leftClip = Math.max(0, ixQ);
    const rightClip = Math.max(0, tabsW - (ixQ + iwQ));
    const indKey = `${leftClip}|${rightClip}`;
    const isIndMoving = !ix.rest() || !iw.rest();
    if (isIndMoving !== indWillChangeRef.current) {
      indWillChangeRef.current = isIndMoving;
      if (pindRef.current) {
        pindRef.current.style.willChange = isIndMoving ? 'clip-path' : '';
      }
    }
    if (indKey !== lastIndKeyRef.current) {
      lastIndKeyRef.current = indKey;
      if (pindRef.current) {
        pindRef.current.style.clipPath = `inset(0 ${rightClip}px 0 ${leftClip}px round 9px)`;
      }
    }

    const hp = clamp(hold.x / 100, 0, 1);
    const holdQ = Math.round(hp * 100);
    if (holdQ !== lastHoldQRef.current) {
      lastHoldQRef.current = holdQ;
      if (holdFillRef.current) {
        holdFillRef.current.style.transform = `translate3d(0, 0, 0) scaleY(${hp})`;
      }
      if (holdTextWrapRef.current) {
        holdTextWrapRef.current.style.color = hp > 0.4 ? '#FFFFFF' : '';
      }
      if (holdLabelRef.current) {
        const nextText = hp > 0.1 ? defaultHoldBusy : defaultHoldIdle;
        if (holdLabelRef.current.textContent !== nextText) {
          holdLabelRef.current.textContent = nextText;
        }
      }
    }

    if (holdToDelete && isHoldingRef.current && hp >= 0.96 && activeItem && onDelete) {
      isHoldingRef.current = false;
      hold.t = 0;
      hold.x = 0;
      hold.v = 0;
      onDelete(activeItem);
      onClose();
    }
  }, [activeItem, onClose, onDelete, holdToDelete, defaultHoldBusy, defaultHoldIdle]);

  useLayoutEffect(() => {
    const unsub = subscribeFrame(drawPanel);
    drawPanel();
    return () => {
      unsub();
    };
  }, [drawPanel]);

  const activeId = activeItem ? keyExtractor(activeItem) : null;

  useLayoutEffect(() => {
    const pp = ppRef.current;
    const ix = ixRef.current;
    const iw = iwRef.current;
    if (!pp || !ix || !iw) return;

    if (isOpen && activeItem) {
      openerRef.current = openerElement || (document.activeElement as HTMLElement | null);
      if (panelRef.current) {
        panelRef.current.setAttribute('aria-hidden', 'false');
      }
      if (ptabsRef.current && ptabsRef.current.clientWidth > 0) {
        ptabsWidthRef.current = ptabsRef.current.clientWidth;
      }

      const activeBtn = tabBtnRefs.current[activeTab];
      if (activeBtn) {
        ix.t = activeBtn.offsetLeft;
        iw.t = activeBtn.offsetWidth;
        if (pp.x < 1) {
          ix.snap();
          iw.snap();
        }
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
      if (panelRef.current) {
        panelRef.current.setAttribute('aria-hidden', 'true');
      }
      drawPanel();
      wake();

      if (openerRef.current && openerRef.current.isConnected) {
        openerRef.current.focus({ preventScroll: true });
      }
    }
  }, [isOpen, activeId]);

  useLayoutEffect(() => {
    const pp = ppRef.current;
    const ix = ixRef.current;
    const iw = iwRef.current;
    if (!pp || !ix || !iw) return;

    if (ptabsRef.current && ptabsRef.current.clientWidth > 0) {
      ptabsWidthRef.current = ptabsRef.current.clientWidth;
    }
    const btn = tabBtnRefs.current[activeTab];
    if (btn) {
      ix.setTarget(btn.offsetLeft);
      iw.setTarget(btn.offsetWidth);
      if (pp.x < 1) {
        ix.snap();
        iw.snap();
      }
      drawPanel();
      wake();
    }
  }, [activeTab, isOpen, drawPanel]);

  const itemIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < allItems.length; i++) {
      map.set(keyExtractor(allItems[i]), i);
    }
    return map;
  }, [allItems, keyExtractor]);

  const currentIdx = activeId ? (itemIndexMap.get(activeId) ?? -1) : -1;
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < allItems.length - 1;

  const handleStep = useCallback(
    (delta: number) => {
      if (currentIdx === -1 || !onSelectItem) return;
      const nextIdx = currentIdx + delta;
      if (nextIdx >= 0 && nextIdx < allItems.length) {
        onSelectItem(allItems[nextIdx]);
      }
    },
    [allItems, currentIdx, onSelectItem]
  );

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      const tag = (document.activeElement?.tagName || '').toUpperCase();
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        if (e.key === 'ArrowUp' && hasPrev) {
          e.preventDefault();
          handleStep(-1);
          return;
        }
        if (e.key === 'ArrowDown' && hasNext) {
          e.preventDefault();
          handleStep(1);
          return;
        }
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(
          (el) =>
            !el.hasAttribute('disabled') &&
            el.getAttribute('tabindex') !== '-1' &&
            el.offsetParent !== null
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

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, hasPrev, hasNext, handleStep]);

  useEffect(() => {
    const syncTabsWidth = () => {
      if (ptabsRef.current && ptabsRef.current.clientWidth > 0) {
        ptabsWidthRef.current = ptabsRef.current.clientWidth;
      }
      const btn = tabBtnRefs.current[activeTab];
      if (btn && ixRef.current && iwRef.current) {
        ixRef.current.t = btn.offsetLeft;
        iwRef.current.t = btn.offsetWidth;
        ixRef.current.snap();
        iwRef.current.snap();
        drawPanel();
      }
    };
    window.addEventListener('resize', syncTabsWidth);
    return () => window.removeEventListener('resize', syncTabsWidth);
  }, [activeTab, drawPanel]);

  useEffect(() => {
    return () => {
      ppRef.current?.destroy();
      ixRef.current?.destroy();
      iwRef.current?.destroy();
      holdRef.current?.destroy();
      ppRef.current = null;
      ixRef.current = null;
      iwRef.current = null;
      holdRef.current = null;
    };
  }, []);

  if (!activeItem) return null;

  const resolvedCloseLabel =
    closeLabel || (language === 'ar' ? 'إغلاق' : language === 'fr' ? 'Fermer' : 'Close');

  const panelNode = (
    <>
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

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        aria-labelledby="kinetic-pnl-title"
        className="pnl fixed right-3.5 rtl:right-auto rtl:left-3.5 top-3.5 bottom-3.5 w-[560px] max-w-[calc(100vw-28px)] z-[61] sq-elev-pop flex flex-col"
        style={{
          visibility: 'hidden',
          transform: 'translate3d(620px, 0, 0)',
          contain: 'layout paint',
        }}
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="relative w-full h-full bg-white dark:bg-[#1C1B1A] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] flex flex-col overflow-hidden"
        >
        {/* Header (.ph) */}
        <div className="ph flex gap-4 items-start px-[26px] pt-[26px] pb-[18px]">
          {avatarText && (
            <div className="sq-elev-card shrink-0">
              <div
                data-sq="card"
                data-sq-border="none"
                className="pav relative w-[68px] h-[68px] grid place-items-center text-white font-bold text-[26px] select-none"
                style={{ backgroundColor: avatarColor }}
                aria-hidden="true"
              >
                {avatarText}
              </div>
            </div>
          )}

          <div className="pmeta flex-1 min-w-0">
            <h2
              id="kinetic-pnl-title"
              className="m-0 mb-2 font-bold text-[24px] sm:text-[26px] leading-tight text-black dark:text-white tracking-tight truncate"
            >
              {title}
            </h2>
            <div className="ppills flex gap-1.5 flex-wrap items-center">
              {statusLabel && (
                <span
                  className={`pill inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[12px] font-medium ${
                    statusClassName ||
                    'bg-[#DDF5E8] text-[#0B7A45] border border-[#B5E8CE]'
                  }`}
                >
                  <i className="w-1.5 h-1.5 rounded-full bg-current" />
                  {statusLabel}
                </span>
              )}
              {branchName && (
                <span className="pill inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[12px] font-medium bg-[#F3EDE7] dark:bg-[#262422] text-black dark:text-white border border-[#E6DED6] dark:border-[#3A3734]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--atr-acc,#d4522f)]" />
                  {branchName}
                </span>
              )}
              {categoryLabel && (
                <span className="pill inline-flex items-center px-2.5 py-[3px] rounded-full text-[12px] font-medium bg-[var(--atr-hl,rgba(212,82,47,0.12))] dark:bg-[#2C1D18] text-[var(--atr-acc-text,#ab391a)] dark:text-[#FF8D7A] border border-[#d4522f]/25 dark:border-[#52291F]">
                  {categoryLabel}
                </span>
              )}
              {headerPills}
            </div>
            {subtitle && (
              <span className="block mt-2 font-mono text-[11px] text-black/68 dark:text-white/70 truncate">
                {subtitle}
              </span>
            )}
          </div>

          <div className="pnav flex gap-1.5 shrink-0">
            {onSelectItem && (
              <>
                <button
                  type="button"
                  data-no-liquid="true"
                  disabled={!hasPrev}
                  onClick={() => handleStep(-1)}
                  aria-label="Previous"
                  className="w-[34px] h-[34px] rounded-full border border-[#E6DED6] dark:border-[#3A3734] bg-white dark:bg-[#262422] grid place-items-center text-black dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:not-disabled:bg-[#d4522f]/12 transition-colors cursor-pointer"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  data-no-liquid="true"
                  disabled={!hasNext}
                  onClick={() => handleStep(1)}
                  aria-label="Next"
                  className="w-[34px] h-[34px] rounded-full border border-[#E6DED6] dark:border-[#3A3734] bg-white dark:bg-[#262422] grid place-items-center text-black dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:not-disabled:bg-[#d4522f]/12 transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              ref={closeBtnRef}
              type="button"
              data-no-liquid="true"
              onClick={onClose}
              aria-label={resolvedCloseLabel}
              className="w-[34px] h-[34px] rounded-full border border-[#E6DED6] dark:border-[#3A3734] bg-white dark:bg-[#262422] grid place-items-center text-black dark:text-white hover:bg-[#d4522f]/12 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Spring Tab Strip (.ptabs + .pind) */}
        {tabs.length > 0 && (
          <div
            ref={ptabsRef}
            role="tablist"
            data-sq="ctl"
            data-sq-border="none"
            className="ptabs relative flex mx-[26px] p-[3px] bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#262422]"
          >
            <i
              ref={pindRef}
              aria-hidden="true"
              className="pind absolute top-[3px] bottom-[3px] left-0 right-0 rounded-[9px] bg-[var(--atr-acc,#d4522f)] pointer-events-none z-0"
              style={{ clipPath: 'inset(0 100% 0 3px round 9px)' }}
            />
            {tabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabBtnRefs.current[tab.id] = el;
                  }}
                  type="button"
                  role="tab"
                  data-no-liquid="true"
                  aria-selected={isSelected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative z-[1] flex-1 h-[36px] border-0 bg-transparent font-semibold text-[13px] rounded-[9px] transition-colors duration-160 cursor-pointer whitespace-nowrap truncate ${
                    isSelected
                      ? 'text-white'
                      : 'text-[var(--atr-ink,#000000)] dark:text-white/88'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable Staggered Body (.pb) */}
        <div
          role="tabpanel"
          data-anim={entranceEpoch & 1}
          className="pb flex-1 overflow-y-auto px-[26px] pt-1.5 pb-[18px] select-text"
          style={{ scrollbarWidth: 'thin' }}
        >
          {renderBody(activeItem, activeTab, entranceEpoch)}
        </div>

        {/* Footer (.pf) */}
        <div className="pf flex justify-between items-center px-[26px] py-4 border-t border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734]">
          {onDelete ? (
            holdToDelete ? (
              <button
                type="button"
                data-no-liquid="true"
                data-sq="ctl"
                data-sq-border="solid"
                onPointerDown={() => {
                  isHoldingRef.current = true;
                  holdRef.current?.setTarget(100);
                  wake();
                }}
                onPointerUp={() => {
                  isHoldingRef.current = false;
                  holdRef.current?.setTarget(0);
                  wake();
                }}
                onPointerLeave={() => {
                  isHoldingRef.current = false;
                  holdRef.current?.setTarget(0);
                  wake();
                }}
                onPointerCancel={() => {
                  isHoldingRef.current = false;
                  holdRef.current?.setTarget(0);
                  wake();
                }}
                className="relative overflow-hidden h-[40px] px-4 [--sq-stroke:#F5BDB3] dark:[--sq-stroke:#5C2B24] bg-[#FDE4DF]/70 dark:bg-[#3D1E1A]/60 text-[#B8321C] dark:text-[#FF8D7A] font-semibold text-[12.5px] flex items-center gap-2 cursor-pointer select-none"
              >
                <span
                  ref={holdFillRef}
                  className="absolute inset-0 bg-[#c0283d] origin-bottom pointer-events-none"
                  style={{ transform: 'translate3d(0, 0, 0) scaleY(0)' }}
                />
                <span
                  ref={holdTextWrapRef}
                  className="relative z-10 flex items-center gap-2 transition-colors duration-75"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span ref={holdLabelRef}>{defaultHoldIdle}</span>
                </span>
              </button>
            ) : (
              <button
                type="button"
                data-no-liquid="true"
                onClick={() => {
                  onDelete(activeItem);
                  onClose();
                }}
                className="border-0 bg-transparent text-[#c0283d] hover:text-[#91200E] dark:text-[#FF8D7A] font-semibold text-[13px] flex items-center gap-2 py-2 px-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {deleteLabel ||
                    (language === 'ar' ? 'حذف' : language === 'fr' ? 'Supprimer' : 'Delete')}
                </span>
              </button>
            )
          ) : (
            <div />
          )}

          <button
            type="button"
            data-no-liquid="true"
            data-sq="ctl"
            data-sq-border="none"
            onClick={onClose}
            className="relative h-[40px] px-7 border-0 bg-[#d4522f] hover:bg-[#b03b1b] text-white font-semibold text-[14px] cursor-pointer transition-colors"
          >
            {resolvedCloseLabel}
          </button>
        </div>
        </div>
      </aside>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(panelNode, document.body) : panelNode;
}

export const KineticSlideOverInspector = React.memo(
  KineticSlideOverInspectorInner
) as typeof KineticSlideOverInspectorInner;
