import React from 'react';
import { SlidersHorizontal, RotateCcw, X } from 'lucide-react';
import { Button as BrandedAtriumButton } from '@/atrium/core';
import { LiveSegmentedControl, SegmentedOption } from '../live/LiveSegmentedControl';
import { LiveSelect } from '../live/LiveSelect';
import { KineticModalShell } from './KineticModalShell';

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
  const dialogTitle =
    language === 'ar'
      ? 'مرشحات متقدمة'
      : language === 'fr'
      ? 'Filtres avancés'
      : 'Advanced Filters';

  return (
    <KineticModalShell
      isOpen={isOpen}
      onClose={onClose}
      triggerRef={triggerRef}
      maxWidthClass="max-w-lg"
      zIndexClass="z-[9999]"
      ariaLabel={dialogTitle}
      scrimClassName="bg-black/45 dark:bg-black/70 p-4 sm:p-6"
      dialogClassName="max-h-[85vh] flex flex-col"
    >
      <div
        data-sq="panel"
        data-sq-border="solid"
        className="relative w-full max-h-[85vh] bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-[var(--modal-pad,24px)] flex flex-col gap-[var(--modal-gap,20px)] text-[var(--text-1)] overflow-hidden select-text"
      >
        <div className="flex items-center justify-between pb-[var(--s4,16px)] border-b border-[var(--atr-divider)] shrink-0">
          <div className="flex items-center gap-[var(--s3,12px)] min-w-0">
            <div className="w-[var(--tile-sm,32px)] h-[var(--tile-sm,32px)] rounded-full bg-[#d4522f]/12 dark:bg-[#d4522f]/20 flex items-center justify-center text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] shadow-2xs shrink-0">
              <SlidersHorizontal size={16} strokeWidth={1.5} />
            </div>
            <span className="t-dialog text-[var(--text-1)] truncate">
              {dialogTitle}
            </span>
          </div>
          <div className="flex items-center gap-[var(--s2,8px)] shrink-0">
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
              className="w-[var(--btn-sm-h,32px)] h-[var(--btn-sm-h,32px)] rounded-full hover:bg-[#F3EDE7] dark:hover:bg-[#2B2825] text-[var(--text-2)] hover:text-[var(--text-1)] flex items-center justify-center cursor-pointer transition-colors"
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
            const useSegmented = section.options.length <= 4;
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

                {useSegmented ? (
                  <LiveSegmentedControl
                    size="sm"
                    fullWidth
                    className="min-w-0 [&>button]:min-w-0 [&>button]:px-[var(--s2,8px)]"
                    options={section.options as SegmentedOption[]}
                    value={section.value}
                    onValueChange={(val) => section.onChange(val)}
                    aria-label={section.label}
                  />
                ) : (
                  <LiveSelect
                    size="md"
                    tone="soft"
                    className="w-full justify-between"
                    aria-label={section.label}
                    value={section.value}
                    onValueChange={(val) => section.onChange(val)}
                    options={section.options.map((opt) => ({
                      value: opt.value,
                      label: opt.label,
                      tooltip: opt.tooltip,
                      description:
                        opt.count !== undefined
                          ? `${opt.sublabel ? `${opt.sublabel} · ` : ''}${opt.count}`
                          : opt.sublabel,
                    }))}
                  />
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
    </KineticModalShell>
  );
});

KineticFilterModal.displayName = 'KineticFilterModal';
