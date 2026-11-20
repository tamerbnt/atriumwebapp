import React, { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, RotateCcw, X } from 'lucide-react';
import { Button as BrandedAtriumButton } from '@/atrium';
import { LiveSegmentedControl, SegmentedOption } from '../live/LiveSegmentedControl';
import {
  Sp,
  TUNES,
  subscribeFrame,
  subscribeCleanup,
  wake,
  checkReducedMotion,
} from './kineticMotion';
import {
  computeKineticModalMetrics,
  computeKineticModalTransformOrigin,
  shouldFinishModalClosing,
} from './kineticMath';

export interface KineticFilterTileOption {
  value: string;
  label: string;
  sublabel?: string;
  count?: number | string;
  tooltip?: string;
}

export interface KineticFilterSection {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  resetValue?: string;
  resetLabel?: string;
  kind: 'segmented' | 'tiles';
  columns?: 2 | 3;
  options: KineticFilterTileOption[];
}

export interface KineticFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  language?: string;
  displayCount: number;
  entityPluralLabel: string;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  sections: KineticFilterSection[];
}

export const KineticFilterModal: React.FC<KineticFilterModalProps> = React.memo(({
  isOpen,
  onClose,
  triggerRef,
  language = 'fr',
  displayCount,
  entityPluralLabel,
  hasActiveFilters,
  onResetFilters,
  sections,
}) => {
  const hasMountedRef = useRef(isOpen);
  if (isOpen) hasMountedRef.current = true;

  const scrimRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const springRef = useRef<Sp | null>(null);
  const stateRef = useRef<'closed' | 'opening' | 'open' | 'closing'>('closed');
  const lastDrawKeyRef = useRef<string>('');
  const willChangeRef = useRef<boolean>(false);

  if (!springRef.current) {
    springRef.current = new Sp(isOpen ? 100 : 0, TUNES.modal);
  }

  const finishClosing = useCallback(() => {
    const root = scrimRef.current;
    const dialog = dialogRef.current;
    const s = springRef.current;
    if (s) {
      s.t = 0;
      s.x = 0;
      s.v = 0;
    }
    if (root) {
      root.hidden = true;
      root.style.opacity = '0';
      root.style.pointerEvents = 'none';
      root.style.willChange = '';
    }
    if (dialog) {
      dialog.style.transform = checkReducedMotion()
        ? 'scale3d(1, 1, 1)'
        : 'scale3d(0.72, 0.72, 1)';
      dialog.style.willChange = '';
    }
    stateRef.current = 'closed';
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        triggerRef?.current?.focus?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, triggerRef]);

  useEffect(() => {
    const drawFilterModal = () => {
      const st = stateRef.current;
      if (st === 'closed' || checkReducedMotion()) return;
      const root = scrimRef.current;
      const dialog = dialogRef.current;
      const s = springRef.current;
      if (!root || !dialog || !s) return;
      if (st === 'open' && s.rest()) return;

      const metrics = computeKineticModalMetrics(s.x, false);
      const opQ = Math.round(metrics.opacity * 100) / 100;
      const scQ = Math.round(metrics.scale * 1000) / 1000;
      const key = `${opQ}|${scQ}`;
      if (key !== lastDrawKeyRef.current) {
        lastDrawKeyRef.current = key;
        root.style.opacity = String(opQ);
        dialog.style.transform = `scale3d(${scQ}, ${scQ}, 1)`;
      }
    };

    const cleanFilterModal = () => {
      const st = stateRef.current;
      if (st === 'closed' || checkReducedMotion()) return;
      const root = scrimRef.current;
      const dialog = dialogRef.current;
      const s = springRef.current;
      if (!root || !dialog || !s) return;

      if (st === 'opening' && s.t === 100 && s.rest()) {
        s.snap();
        lastDrawKeyRef.current = '1|1';
        root.style.opacity = '1';
        dialog.style.transform = 'scale3d(1, 1, 1)';
        if (willChangeRef.current) {
          willChangeRef.current = false;
          root.style.willChange = '';
          dialog.style.willChange = '';
        }
        stateRef.current = 'open';
      } else if (st === 'closing' && shouldFinishModalClosing(s.x, s.t)) {
        lastDrawKeyRef.current = '';
        willChangeRef.current = false;
        finishClosing();
      }
    };

    const unsubDraw = subscribeFrame(drawFilterModal);
    const unsubClean = subscribeCleanup(cleanFilterModal);
    return () => {
      unsubDraw();
      unsubClean();
      springRef.current?.destroy();
      springRef.current = null;
    };
  }, [finishClosing]);

  useLayoutEffect(() => {
    const root = scrimRef.current;
    const dialog = dialogRef.current;
    const s = springRef.current;
    if (!root || !dialog || !s) return;

    if (isOpen) {
      const st = stateRef.current;
      if (st === 'opening' || st === 'open') return;
      const reduced = checkReducedMotion();
      stateRef.current = reduced ? 'open' : 'opening';
      root.hidden = false;
      root.style.pointerEvents = 'auto';
      root.style.opacity = reduced ? '1' : '0';
      dialog.style.transform = reduced ? 'scale3d(1, 1, 1)' : 'scale3d(0.72, 0.72, 1)';

      const dRect = dialog.getBoundingClientRect();
      const tRect = triggerRef?.current?.isConnected
        ? triggerRef.current.getBoundingClientRect()
        : null;
      dialog.style.transformOrigin = computeKineticModalTransformOrigin(
        tRect,
        dRect,
        typeof window !== 'undefined' ? window.innerWidth : 1280,
        typeof window !== 'undefined' ? window.innerHeight : 800
      );

      if (reduced) {
        s.t = 100;
        s.snap();
        lastDrawKeyRef.current = '1|1';
      } else {
        willChangeRef.current = true;
        root.style.willChange = 'opacity';
        dialog.style.willChange = 'transform';
        if (st === 'closed') {
          s.x = 0;
          s.v = 0;
        }
        s.setTarget(100);
        wake();
      }
    } else if (stateRef.current === 'opening' || stateRef.current === 'open') {
      const reduced = checkReducedMotion();
      root.style.pointerEvents = 'none';
      if (reduced) {
        finishClosing();
      } else {
        stateRef.current = 'closing';
        willChangeRef.current = true;
        root.style.willChange = 'opacity';
        dialog.style.willChange = 'transform';
        s.setTarget(0);
        wake();
      }
    }
  }, [isOpen, finishClosing, triggerRef]);

  if (!hasMountedRef.current) return null;

  const dialogTitle =
    language === 'ar'
      ? 'مرشحات متقدمة'
      : language === 'fr'
      ? 'Filtres avancés'
      : 'Advanced Filters';

  const modalNode = (
    <div
      ref={scrimRef}
      hidden={!isOpen && stateRef.current === 'closed'}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/45 dark:bg-black/70 select-none"
      style={{ opacity: 0, pointerEvents: 'none' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      aria-label={dialogTitle}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg max-h-[85vh] sq-elev-pop flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          style={{ contain: 'layout paint' }}
          className="relative w-full max-h-[85vh] bg-white dark:bg-[#1C1B1A] [--sq-stroke:var(--sq-stroke-pop)] p-[var(--modal-pad,24px)] flex flex-col gap-[var(--modal-gap,20px)] text-[var(--text-1)] overflow-hidden select-text"
        >
        <div className="flex items-center justify-between pb-[var(--s4,16px)] border-b border-[var(--atr-divider)] shrink-0">
          <div className="flex items-center gap-[var(--s3,12px)]">
            <div className="w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] rounded-full bg-[#d4522f]/12 dark:bg-[#d4522f]/20 flex items-center justify-center text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] shadow-2xs shrink-0">
              <SlidersHorizontal size={16} strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-[var(--s1,4px)]">
              <span className="t-dialog text-[var(--text-1)] block">
                {dialogTitle}
              </span>
              <span className="t-cap text-[var(--text-2)] tabular-nums">
                {displayCount} {entityPluralLabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-[var(--s2,8px)]">
            {hasActiveFilters && (
              <button
                type="button"
                data-no-liquid="true"
                data-sq="ctl-sm"
                data-sq-border="none"
                onClick={onResetFilters}
                className="t-small font-semibold text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] hover:underline flex items-center gap-[var(--s1,4px)] cursor-pointer transition-colors px-[var(--s2,8px)] h-[var(--btn-sm-h,32px)]"
              >
                <RotateCcw size={16} strokeWidth={1.5} />
                <span>
                  {language === 'ar' ? 'إعادة ضبط' : language === 'fr' ? 'Réinitialiser' : 'Reset'}
                </span>
              </button>
            )}
            <button
              type="button"
              data-no-liquid="true"
              onClick={onClose}
              className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] rounded-full hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 text-[var(--text-2)] hover:text-[var(--text-1)] flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Close filters"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-[var(--s4,16px)] overflow-y-auto pe-[var(--s1,4px)] max-h-[58vh]">
          {sections.map((section) => {
            const resetVal = section.resetValue ?? 'All';
            const resetText =
              section.resetLabel ||
              (language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All');
            return (
              <div key={section.id} className="flex flex-col gap-[var(--s2,8px)]">
                <div className="flex items-center justify-between gap-[var(--s2,8px)]">
                  <label className="t-small font-semibold text-[var(--text-2)]">
                    {section.label}
                  </label>
                  {section.value !== resetVal && (
                    <button
                      type="button"
                      data-no-liquid="true"
                      onClick={() => section.onChange(resetVal)}
                      className="t-small text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] font-semibold hover:underline cursor-pointer"
                    >
                      {resetText}
                    </button>
                  )}
                </div>

                {section.kind === 'segmented' ? (
                  <div className="w-full overflow-x-auto pb-[var(--s1,4px)]">
                    <LiveSegmentedControl
                      size="sm"
                      fullWidth
                      className="min-w-0 [&>button]:min-w-0 [&>button]:px-[var(--s2,8px)]"
                      options={section.options as SegmentedOption[]}
                      value={section.value}
                      onValueChange={(val) => section.onChange(val)}
                      aria-label={section.label}
                    />
                  </div>
                ) : (
                  <div
                    className={`grid gap-[var(--s2,8px)] max-h-40 overflow-y-auto pe-[var(--s1,4px)] ${
                      section.columns === 3
                        ? 'grid-cols-2 sm:grid-cols-3'
                        : 'grid-cols-1 sm:grid-cols-2'
                    }`}
                  >
                    {section.options.map((opt) => {
                      const isSelected = section.value === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          data-no-liquid="true"
                          data-sq="row"
                          data-sq-border="solid"
                          onClick={() => section.onChange(opt.value)}
                          title={opt.tooltip || opt.label}
                          className={`relative px-[var(--s3,12px)] py-[var(--s2,8px)] t-small flex items-center justify-between gap-[var(--s2,8px)] cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#d4522f]/12 dark:bg-[#d4522f]/20 text-[var(--atr-acc-text,#ab391a)] dark:text-[var(--brand-on-dark)] [--sq-stroke:rgba(212,82,47,0.45)] font-semibold'
                              : 'bg-[#FBF8F5] dark:bg-neutral-800/60 text-[var(--text-1)] hover:bg-[#F3EDE7] dark:hover:bg-neutral-700/50'
                          }`}
                        >
                          <div className="min-w-0 text-start flex flex-col gap-[var(--s1,4px)]">
                            <div className="truncate font-semibold">{opt.label}</div>
                            {opt.sublabel && (
                              <div className="t-cap text-[var(--text-2)] tabular-nums truncate">
                                {opt.sublabel}
                              </div>
                            )}
                          </div>
                          {opt.count !== undefined && (
                            <span className="t-cap text-[var(--text-2)] tabular-nums shrink-0">
                              {opt.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-[var(--s3,12px)] border-t border-[var(--atr-divider)] flex items-center gap-[var(--s2,8px)] shrink-0">
          {hasActiveFilters && (
            <BrandedAtriumButton
              tone="soft"
              size={40}
              onClick={onResetFilters}
              className="t-btn"
            >
              <span>
                {language === 'ar' ? 'إعادة ضبط' : language === 'fr' ? 'Réinitialiser' : 'Reset'}
              </span>
            </BrandedAtriumButton>
          )}
          <BrandedAtriumButton
            tone="accent"
            size={40}
            onClick={onClose}
            className="flex-1 t-btn"
          >
            <span>
              {language === 'ar'
                ? `عرض ${displayCount} من ${entityPluralLabel}`
                : language === 'fr'
                ? `Afficher ${displayCount} ${entityPluralLabel}`
                : `Show ${displayCount} ${entityPluralLabel}`}
            </span>
          </BrandedAtriumButton>
        </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
});

KineticFilterModal.displayName = 'KineticFilterModal';
