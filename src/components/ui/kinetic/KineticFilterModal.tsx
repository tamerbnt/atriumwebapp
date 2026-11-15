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
        style={{ contain: 'layout paint' }}
        className="w-full max-w-lg max-h-[85vh] bg-white dark:bg-[#1C1B1A] rounded-[26px] border border-[#E6DED6] dark:border-[#3A3734] shadow-[0_18px_48px_rgba(0,0,0,0.22)] p-5 sm:p-6 space-y-4 text-black dark:text-white overflow-hidden flex flex-col select-text"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E6DED6] dark:border-[#3A3734] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#d4522f]/12 dark:bg-[#d4522f]/20 flex items-center justify-center text-[#d4522f] shadow-2xs">
              <SlidersHorizontal size={16} />
            </div>
            <div>
              <span className="text-sm font-semibold text-black dark:text-white tracking-tight block">
                {dialogTitle}
              </span>
              <span className="text-xs text-black/62 dark:text-white/68 tabular-nums">
                {displayCount} {entityPluralLabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                data-no-liquid="true"
                onClick={onResetFilters}
                className="text-xs font-semibold text-[#d4522f] hover:underline flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-md"
              >
                <RotateCcw size={12} />
                <span>
                  {language === 'ar' ? 'إعادة ضبط' : language === 'fr' ? 'Réinitialiser' : 'Reset'}
                </span>
              </button>
            )}
            <button
              type="button"
              data-no-liquid="true"
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 text-black/62 dark:text-white/68 hover:text-black dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Close filters"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto pr-1 max-h-[58vh] -mr-1">
          {sections.map((section) => {
            const resetVal = section.resetValue ?? 'All';
            const resetText =
              section.resetLabel ||
              (language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All');
            return (
              <div key={section.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11.5px] font-semibold uppercase tracking-[0.06em] rtl:normal-case rtl:tracking-normal text-black/72 dark:text-white/75">
                    {section.label}
                  </label>
                  {section.value !== resetVal && (
                    <button
                      type="button"
                      data-no-liquid="true"
                      onClick={() => section.onChange(resetVal)}
                      className="text-[11px] text-[#d4522f] font-semibold hover:underline cursor-pointer"
                    >
                      {resetText}
                    </button>
                  )}
                </div>

                {section.kind === 'segmented' ? (
                  <div className="w-full overflow-x-auto pb-0.5">
                    <LiveSegmentedControl
                      size="sm"
                      fullWidth
                      className="min-w-0 [&>button]:min-w-0 [&>button]:px-2"
                      options={section.options as SegmentedOption[]}
                      value={section.value}
                      onValueChange={(val) => section.onChange(val)}
                      aria-label={section.label}
                    />
                  </div>
                ) : (
                  <div
                    className={`grid gap-1.5 max-h-40 overflow-y-auto pr-1 ${
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
                          onClick={() => section.onChange(opt.value)}
                          title={opt.tooltip || opt.label}
                          className={`px-3 py-2 rounded-[9px] border text-xs flex items-center justify-between font-medium cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#d4522f]/12 dark:bg-[#d4522f]/20 text-[#d4522f] border-[#d4522f]/40 font-semibold shadow-2xs'
                              : 'bg-[#FBF8F5] dark:bg-neutral-800/60 border-[#E6DED6] dark:border-neutral-700/60 text-black/75 dark:text-white/80 hover:bg-[#F3EDE7] dark:hover:bg-neutral-700/50'
                          }`}
                        >
                          <div className="min-w-0 text-left rtl:text-right">
                            <div className="truncate font-semibold">{opt.label}</div>
                            {opt.sublabel && (
                              <div className="text-[11px] text-black/62 dark:text-white/65 font-mono tabular-nums truncate">
                                {opt.sublabel}
                              </div>
                            )}
                          </div>
                          {opt.count !== undefined && (
                            <span className="text-[11px] font-mono opacity-75 tabular-nums ml-2 shrink-0">
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

        <div className="pt-3 border-t border-[#E6DED6] dark:border-[#3A3734] flex items-center gap-2 shrink-0">
          {hasActiveFilters && (
            <BrandedAtriumButton
              tone="soft"
              size={40}
              onClick={onResetFilters}
              className="font-semibold text-xs"
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
            className="flex-1 font-semibold text-xs"
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
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
});

KineticFilterModal.displayName = 'KineticFilterModal';
