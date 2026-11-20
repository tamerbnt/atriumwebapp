import React, { useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { SlidersHorizontal, ChevronDown, List, LayoutGrid, Calendar, X } from 'lucide-react';
import { Seek } from '../Seek';
import { LiveSegmentedControl, SegmentedOption } from '../live/LiveSegmentedControl';
import { LiquidButton } from '@/atrium';
import { ScreenPodBridgeContext } from './ScreenPod';

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

  const podBridge = useContext(ScreenPodBridgeContext);
  const ownerIdRef = useRef<symbol | null>(null);
  if (ownerIdRef.current === null) {
    ownerIdRef.current = Symbol('ScreenCollectionToolbar');
  }

  const inferredTotalCount = useMemo(() => {
    const firstOpt = statusOptions?.[0];
    if (
      firstOpt &&
      typeof firstOpt.count === 'number' &&
      /^(all|tous|tout|everything|overview)$/i.test(String(firstOpt.value))
    ) {
      return firstOpt.count;
    }
    return undefined;
  }, [statusOptions]);

  const activeFilterLabels = useMemo(
    () => activeChips.map((c) => c.label).filter(Boolean),
    [activeChips]
  );
  const chipKey = activeFilterLabels.join('\u0001');

  useLayoutEffect(() => {
    if (!podBridge) return;
    const ownerId = ownerIdRef.current!;
    podBridge.syncToolbar(
      ownerId,
      {
        searchQuery,
        hasSearchSetter: Boolean(onSearchChange),
        statusValue,
        hasActiveAdvancedFilters,
        activeFilterLabels,
        chipKey,
        hasReset: Boolean(onResetAllFilters),
        totalCount: inferredTotalCount,
      },
      {
        onSearchChange,
        onResetAllFilters,
      }
    );
  }, [
    podBridge,
    searchQuery,
    onSearchChange,
    statusValue,
    hasActiveAdvancedFilters,
    activeFilterLabels,
    chipKey,
    onResetAllFilters,
    inferredTotalCount,
  ]);

  useLayoutEffect(() => {
    if (!podBridge) return;
    const ownerId = ownerIdRef.current!;
    return () => {
      podBridge.clearToolbar(ownerId);
    };
  }, [podBridge]);

  const defaultSearchPlaceholder =
    searchPlaceholder ||
    (language === 'ar' ? 'بحث...' : language === 'fr' ? 'Rechercher...' : 'Search...');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 w-full pt-1 px-3 pb-1">
        {/* Left: Inter SemiBold 16px/22px Pod Title + Polite aria-live count */}
        <div className="flex items-center gap-2 shrink-0">
          <h2 className="text-[var(--t-h3)] leading-[var(--pod-head-h,22px)] font-semibold text-[var(--text-1)] dark:text-white">
            {title}
          </h2>
          {liveRegionText && (
            <div aria-live="polite" className="sr-only">
              {liveRegionText}
            </div>
          )}
        </div>

        {/* Right: Exact Member Screen Control Order & 40px Height */}
        <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 ms-auto">
          {/* 1. Seek Expanding Search */}
          <Seek
            value={searchQuery}
            onChange={onSearchChange}
            placeholder={defaultSearchPlaceholder}
            shutSize={40}
            openWidth={240}
            shape="squircle"
            className="shrink-0"
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
            <div className="relative shrink-0 sq-elev-card">
              <button
                ref={filterButtonRef}
                type="button"
                data-no-liquid="true"
                data-sq="ctl"
                data-sq-border="solid"
                onClick={onToggleFilterModal}
                className={`relative h-10 px-4 border flex items-center gap-2 text-xs font-semibold cursor-pointer transition-colors select-none ${
                  hasActiveAdvancedFilters || isFilterModalOpen
                    ? 'bg-[#d4522f]/12 dark:bg-[#d4522f]/15 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] [--sq-stroke:rgba(201,70,31,0.5)]'
                    : 'bg-white dark:bg-neutral-800 [--sq-stroke:#E6DED6] dark:[--sq-stroke:rgba(64,64,64,0.6)] text-[var(--text-1)] dark:text-white hover:bg-[#FBF8F5] dark:hover:bg-neutral-700/50'
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
                  size={16}
                  className={
                    hasActiveAdvancedFilters
                      ? 'text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]'
                      : 'text-[var(--text-2)] dark:text-[var(--text-dark-2)]'
                  }
                />
                <span>
                  {language === 'ar' ? 'مرشحات' : language === 'fr' ? 'Filtres' : 'Filters'}
                </span>
                {activeFiltersCount > 0 && (
                  <span className="w-5 h-5 rounded-full text-xs font-semibold flex items-center justify-center bg-[var(--brand-fill)] text-white tabular-nums">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 text-[var(--text-2)] dark:text-[var(--text-dark-2)] ${
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
                className="shrink-0 !h-10 !max-h-10"
                style={EXPORT_BTN_STYLE}
              />
            )}
          </div>
        </div>
      </div>

      {/* Removable Active Filter Chips Row */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap px-3 text-xs">
          <span className="text-[var(--text-2)] dark:text-[var(--text-dark-2)] font-medium text-xs">
            {language === 'ar'
              ? 'المرشحات النشطة:'
              : language === 'fr'
              ? 'Filtres actifs :'
              : 'Active filters:'}
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              title={chip.title || chip.label}
              className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-[#d4522f]/12 dark:bg-[#d4522f]/20 text-[var(--brand-text)] dark:text-[var(--brand-on-dark)] border border-[#d4522f]/30 text-xs font-medium"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                data-no-liquid="true"
                onClick={chip.onRemove}
                className="hover:text-[var(--text-1)] dark:hover:text-white transition-colors cursor-pointer"
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
              className="text-xs font-semibold text-[var(--text-2)] dark:text-[var(--text-dark-2)] hover:text-[var(--text-1)] dark:hover:text-white underline cursor-pointer px-1"
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
