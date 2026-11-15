import React, { useMemo } from 'react';
import { SlidersHorizontal, ChevronDown, List, LayoutGrid, Calendar, X } from 'lucide-react';
import { Seek } from '../Seek';
import { LiveSegmentedControl, SegmentedOption } from '../live/LiveSegmentedControl';
import { LiquidButton } from '@/atrium';

export interface ActiveFilterChip {
  key: string;
  label: string;
  title?: string;
  onRemove: () => void;
}

export interface ScreenCollectionToolbarProps {
  title: string;
  liveRegionText?: string;
  language?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  statusOptions?: SegmentedOption[];
  statusValue?: string;
  onStatusChange?: (val: string) => void;
  statusAriaLabel?: string;
  hasActiveAdvancedFilters?: boolean;
  activeFiltersCount?: number;
  isFilterModalOpen?: boolean;
  filterButtonRef?: React.Ref<HTMLButtonElement>;
  onToggleFilterModal?: () => void;
  viewMode: 'list' | 'grid' | 'calendar';
  onViewModeChange: (mode: 'list' | 'grid' | 'calendar') => void;
  showViewToggle?: boolean;
  showCalendarToggle?: boolean;
  onExport?: () => void | Promise<void>;
  exportTooltip?: string;
  extraTrailingControls?: React.ReactNode;
  activeChips?: ActiveFilterChip[];
  onResetAllFilters?: () => void;
}

const EXPORT_BTN_STYLE: React.CSSProperties = {
  height: '40px',
  maxHeight: '40px',
  width: '148px',
};

export const ScreenCollectionToolbar: React.FC<ScreenCollectionToolbarProps> = React.memo(({
  title,
  liveRegionText,
  language = 'fr',
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  statusOptions,
  statusValue,
  onStatusChange,
  statusAriaLabel,
  hasActiveAdvancedFilters = false,
  activeFiltersCount = 0,
  isFilterModalOpen = false,
  filterButtonRef,
  onToggleFilterModal,
  viewMode,
  onViewModeChange,
  showViewToggle = true,
  showCalendarToggle = false,
  onExport,
  exportTooltip,
  extraTrailingControls,
  activeChips = [],
  onResetAllFilters,
}) => {
  const viewSwitcherOptions = useMemo(() => {
    const opts: SegmentedOption[] = [
      { value: 'list', icon: <List className="w-4 h-4" />, 'aria-label': 'List View' },
      { value: 'grid', icon: <LayoutGrid className="w-4 h-4" />, 'aria-label': 'Grid View' },
    ];
    if (showCalendarToggle) {
      opts.push({
        value: 'calendar',
        icon: <Calendar className="w-4 h-4" />,
        'aria-label': 'Calendar View',
      });
    }
    return opts;
  }, [showCalendarToggle]);

  const exportLabels = useMemo(
    () => ({
      idle: language === 'ar' ? 'تصدير' : language === 'fr' ? 'Exporter' : 'Export',
      busy:
        language === 'ar'
          ? 'جاري التصدير'
          : language === 'fr'
          ? 'Exportation...'
          : 'Exporting...',
      done: language === 'ar' ? 'تم التصدير' : language === 'fr' ? 'Exporté' : 'Exported',
      error: language === 'ar' ? 'فشل' : language === 'fr' ? 'Échec' : 'Failed',
    }),
    [language]
  );

  const handleExportPress = useMemo(() => {
    if (!onExport) return undefined;
    return async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
      await onExport();
    };
  }, [onExport]);

  const defaultSearchPlaceholder =
    searchPlaceholder ||
    (language === 'ar' ? 'بحث...' : language === 'fr' ? 'Rechercher...' : 'Search...');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 w-full">
        {/* Left: Inter SemiBold 15.5/16px Pod Title + Polite aria-live count */}
        <div className="flex items-center gap-2.5 shrink-0">
          <h2 className="text-[15.5px] sm:text-[16px] font-semibold tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white">
            {title}
          </h2>
          {liveRegionText && (
            <div aria-live="polite" className="sr-only">
              {liveRegionText}
            </div>
          )}
        </div>

        {/* Right: Exact Member Screen Control Order & 40px Height */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 min-w-0 ms-auto">
          {/* 1. Seek Expanding Search */}
          <Seek
            value={searchQuery}
            onChange={onSearchChange}
            placeholder={defaultSearchPlaceholder}
            shutSize={40}
            openWidth={240}
            className="shrink-0 !rounded-xl"
          />

          {/* 2. Quick Status Segmented Control */}
          {statusOptions && statusOptions.length > 0 && onStatusChange && (
            <div className="shrink-0">
              <LiveSegmentedControl
                size="md"
                options={statusOptions}
                value={statusValue ?? String(statusOptions[0]?.value ?? '')}
                onValueChange={onStatusChange}
                aria-label={statusAriaLabel || title}
              />
            </div>
          )}

          {/* 3. Advanced Filters Trigger Button */}
          {onToggleFilterModal && (
            <div className="relative shrink-0">
              <button
                ref={filterButtonRef}
                type="button"
                data-no-liquid="true"
                onClick={onToggleFilterModal}
                className={`h-10 px-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold cursor-pointer transition-all shadow-2xs select-none ${
                  hasActiveAdvancedFilters || isFilterModalOpen
                    ? 'bg-[#d4522f]/12 dark:bg-[#d4522f]/15 text-[#d4522f] border-[#d4522f]/40 ring-1 ring-[#d4522f]/20'
                    : 'bg-white dark:bg-neutral-800 border-[#E6DED6] dark:border-neutral-700/60 text-black/75 dark:text-white/80 hover:bg-[#FBF8F5] dark:hover:bg-neutral-700/50'
                }`}
                title={
                  language === 'ar'
                    ? 'مرشحات متقدمة'
                    : language === 'fr'
                    ? 'Filtres avancés'
                    : 'Advanced Filters'
                }
                aria-expanded={isFilterModalOpen}
              >
                <SlidersHorizontal
                  size={15}
                  className={
                    hasActiveAdvancedFilters
                      ? 'text-[#d4522f]'
                      : 'text-black/70 dark:text-white/75'
                  }
                />
                <span>
                  {language === 'ar' ? 'مرشحات' : language === 'fr' ? 'Filtres' : 'Filters'}
                </span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center bg-[#d4522f] text-white tabular-nums">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 text-black/62 dark:text-white/65 ${
                    isFilterModalOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          )}

          {/* 4 & 5. View Switcher + Liquid Export Button */}
          <div className="flex items-center gap-2 shrink-0">
            {showViewToggle && (
              <LiveSegmentedControl
                size="md"
                options={viewSwitcherOptions}
                value={viewMode}
                onValueChange={(val) => onViewModeChange(val as 'list' | 'grid' | 'calendar')}
                aria-label="View Switcher"
              />
            )}
            {extraTrailingControls}
            {handleExportPress && (
              <LiquidButton
                kind="export"
                size={40}
                tone="accent"
                labels={exportLabels}
                onPress={handleExportPress}
                title={exportTooltip || exportLabels.idle}
                aria-label={exportTooltip || exportLabels.idle}
                className="shrink-0 !h-10 !max-h-10 !rounded-xl"
                style={EXPORT_BTN_STYLE}
              />
            )}
          </div>
        </div>
      </div>

      {/* Removable Active Filter Chips Row */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-0.5 text-xs">
          <span className="text-black/62 dark:text-white/65 font-medium text-[11px]">
            {language === 'ar'
              ? 'المرشحات النشطة:'
              : language === 'fr'
              ? 'Filtres actifs:'
              : 'Active filters:'}
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              title={chip.title || chip.label}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] bg-[#d4522f]/12 dark:bg-[#d4522f]/20 text-[#d4522f] border border-[#d4522f]/30 text-xs font-semibold"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                data-no-liquid="true"
                onClick={chip.onRemove}
                className="hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                title={
                  language === 'ar'
                    ? 'إزالة المرشح'
                    : language === 'fr'
                    ? 'Supprimer filtre'
                    : 'Remove filter'
                }
                aria-label={`Remove ${chip.label} filter`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {onResetAllFilters && (
            <button
              type="button"
              data-no-liquid="true"
              onClick={onResetAllFilters}
              title={
                language === 'ar'
                  ? 'إعادة تعيين كافة المرشحات'
                  : language === 'fr'
                  ? 'Réinitialiser tous les filtres'
                  : 'Reset all filters'
              }
              className="text-[11px] font-semibold text-black/72 dark:text-white/75 hover:text-black dark:hover:text-white underline cursor-pointer ml-1"
            >
              {language === 'ar' ? 'إعادة' : language === 'fr' ? 'Effacer' : 'Reset'}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

ScreenCollectionToolbar.displayName = 'ScreenCollectionToolbar';
