import React, { useMemo, useRef, useState } from 'react';
import { SupportedLanguage, UndoVerticalKey } from '../../../types/index';
import { useUndoHistory } from '../../../services/undoEngine';
import { EmbeddedUndoHistoryPanel } from '../../ui/EmbeddedUndoHistoryPanel';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { SegmentedOption } from '../../ui/live/LiveSegmentedControl';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenHeaderPrimaryAction,
  ScreenKpiBanner,
  KpiFilterCardConfig,
  KpiDarkCardConfig,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticFilterModal,
  KineticFilterSection,
  KineticSlideOverInspector,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
} from '../../ui/kinetic';

export interface VerticalHistoryInspectorConfig<T> {
  title: (item: T) => string;
  subtitle?: (item: T) => string | undefined;
  avatarText?: (item: T) => string | undefined;
  categoryLabel?: (item: T) => string | undefined;
  branchName?: (item: T) => string | undefined;
  statusLabel?: (item: T) => string | undefined;
  statusClassName?: (item: T) => string | undefined;
  tabs?: { id: string; label: string }[];
  renderBody: (item: T, activeTab: string) => React.ReactNode;
}

export interface VerticalHistoryScaffoldProps<T> {
  icon: React.ReactNode;
  title: string;
  primaryAction?: ScreenHeaderPrimaryAction;
  kpiHeading: string;
  primaryCard: KpiFilterCardConfig;
  secondaryCard: KpiFilterCardConfig;
  darkCard: KpiDarkCardConfig;
  podTitle: string;
  searchPlaceholder?: string;
  vertical: UndoVerticalKey;
  businessId: string;
  branchId: string;
  language: SupportedLanguage;
  isRtl?: boolean;
  isSyncing?: boolean;
  networkMode?: string;
  isSyncTimeout?: boolean;
  lastSyncedAt?: string | null;
  onRetrySync?: () => void;
  statusOptions: SegmentedOption[];
  statusValue: string;
  onStatusChange: (val: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  items: T[];
  totalItemCount?: number;
  keyExtractor: (item: T) => string;
  columns: ColumnDefinition<T>[];
  skeletonColumns?: Array<{ width: string; minWidth?: string }>;
  getRowMeta: (item: T) => Partial<KineticRowData>;
  getFanActions?: (item: T) => KineticRowFanAction[];
  getDetailActions?: (item: T) => KineticDetailAction[];
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (key: string, dir: 'asc' | 'desc') => void;
  pinnedIds?: Set<string>;
  onPinToggle?: (itemOrId: any) => void;
  filterSections?: KineticFilterSection[];
  activeChips?: ActiveFilterChip[];
  hasActiveAdvancedFilters?: boolean;
  activeFiltersCount?: number;
  onResetFilters: () => void;
  onExportCsv?: () => void;
  entityPluralLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  inspectorConfig: VerticalHistoryInspectorConfig<T>;
  selectedItem: T | null;
  onSelectItem: (item: T | null) => void;
  extraFooter?: React.ReactNode;
}

export function VerticalHistoryScaffold<T>({
  icon,
  title,
  primaryAction,
  kpiHeading,
  primaryCard,
  secondaryCard,
  darkCard,
  podTitle,
  searchPlaceholder,
  vertical,
  businessId,
  branchId,
  language,
  isRtl = false,
  isSyncing = false,
  networkMode = 'online',
  isSyncTimeout = false,
  lastSyncedAt,
  onRetrySync,
  statusOptions,
  statusValue,
  onStatusChange,
  searchQuery,
  onSearchChange,
  items,
  totalItemCount,
  keyExtractor,
  columns,
  skeletonColumns,
  getRowMeta,
  getFanActions,
  getDetailActions,
  sortBy,
  sortDirection,
  onSortChange,
  pinnedIds,
  onPinToggle,
  filterSections = [],
  activeChips = [],
  hasActiveAdvancedFilters = false,
  activeFiltersCount = 0,
  onResetFilters,
  onExportCsv,
  entityPluralLabel,
  emptyTitle,
  emptyDescription,
  inspectorConfig,
  selectedItem,
  onSelectItem,
  extraFooter,
}: VerticalHistoryScaffoldProps<T>) {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const { entries: undoEntries } = useUndoHistory(businessId, branchId);
  const moduleUndoAvailableCount = useMemo(
    () =>
      undoEntries.filter(
        (e) => (e.vertical === vertical || e.vertical === 'settings') && e.status === 'available'
      ).length,
    [undoEntries, vertical]
  );

  const combinedStatusOptions = useMemo<SegmentedOption[]>(() => {
    const annulationsTab: SegmentedOption = {
      value: 'annulations',
      label: isAr ? 'الإلغاءات' : isEn ? 'Undos' : 'Annulations',
      count: moduleUndoAvailableCount,
    };
    return [...statusOptions, annulationsTab];
  }, [statusOptions, isAr, isEn, moduleUndoAvailableCount]);

  const isAnnulationsTab = statusValue === 'annulations';

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (totalItemCount ?? items.length) > 0,
  });

  if (showSkeleton && ((totalItemCount ?? items.length) === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={
          skeletonColumns || [
            { width: '2.4*', minWidth: '180px' },
            { width: '1.5*', minWidth: '120px' },
            { width: '1.3*', minWidth: '110px' },
            { width: '1.3*', minWidth: '110px' },
            { width: '1.1*', minWidth: '100px' },
          ]
        }
        viewMode={viewMode}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={onRetrySync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenHeaderBar icon={icon} title={title} primaryAction={primaryAction} />

      <ScreenKpiBanner
        heading={kpiHeading}
        language={language}
        primaryCard={primaryCard}
        secondaryCard={secondaryCard}
        darkCard={darkCard}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={podTitle}
          liveRegionText={`${items.length} ${entityPluralLabel}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          statusOptions={combinedStatusOptions}
          statusValue={statusValue}
          onStatusChange={onStatusChange}
          hasActiveAdvancedFilters={!isAnnulationsTab && hasActiveAdvancedFilters}
          activeFiltersCount={isAnnulationsTab ? 0 : activeFiltersCount}
          isFilterModalOpen={!isAnnulationsTab && isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={
            !isAnnulationsTab && filterSections.length > 0
              ? () => setIsFilterModalOpen((p) => !p)
              : undefined
          }
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          showViewToggle={!isAnnulationsTab}
          onExport={!isAnnulationsTab ? onExportCsv : undefined}
          activeChips={isAnnulationsTab ? [] : activeChips}
          onResetAllFilters={
            isAnnulationsTab
              ? undefined
              : () => {
                  onResetFilters();
                  setIsFilterModalOpen(false);
                }
          }
        />

        {isAnnulationsTab ? (
          <EmbeddedUndoHistoryPanel
            businessId={businessId}
            branchId={branchId}
            vertical={vertical}
            language={language}
            externalSearchQuery={searchQuery}
            onExternalSearchChange={onSearchChange}
          />
        ) : (
          <UniversalDataCollection<T>
            items={items}
            keyExtractor={keyExtractor}
            viewMode={viewMode}
            pageSize={50}
            hideToolbar
            openItemId={selectedItem ? keyExtractor(selectedItem) : null}
            isLoading={isSyncing || networkMode === 'force_skeleton'}
            isOffline={networkMode === 'offline'}
            isTimedOut={isSyncTimeout}
            lastSyncedAt={lastSyncedAt}
            onRetrySync={onRetrySync}
            columns={columns}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
            pinnedIds={pinnedIds}
            onPinToggle={onPinToggle}
            onItemClick={(item, opener) => {
              setDrawerOpenerEl(opener || null);
              onSelectItem(item);
            }}
            onViewDetails={(item, opener) => {
              setDrawerOpenerEl(opener || null);
              onSelectItem(item);
            }}
            getRowMeta={getRowMeta}
            getFanActions={getFanActions}
            getDetailActions={getDetailActions}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
            onResetFilters={() => {
              onResetFilters();
              setIsFilterModalOpen(false);
            }}
            hasActiveFilters={
              hasActiveAdvancedFilters ||
              (statusOptions[0]?.value ? statusValue !== String(statusOptions[0].value) : false) ||
              searchQuery.trim().length > 0
            }
          />
        )}
      </ScreenPod>

      {filterSections.length > 0 && (
        <KineticFilterModal
          isOpen={isFilterModalOpen && !isAnnulationsTab}
          onClose={() => setIsFilterModalOpen(false)}
          triggerRef={filterButtonRef}
          language={language}
          displayCount={items.length}
          entityPluralLabel={entityPluralLabel}
          hasActiveFilters={hasActiveAdvancedFilters}
          onResetFilters={() => {
            onResetFilters();
            setIsFilterModalOpen(false);
          }}
          sections={filterSections}
        />
      )}

      <KineticSlideOverInspector<T>
        isOpen={selectedItem !== null}
        item={selectedItem}
        allItems={items}
        keyExtractor={keyExtractor}
        openerElement={drawerOpenerEl}
        language={language}
        title={selectedItem ? inspectorConfig.title(selectedItem) : ''}
        subtitle={selectedItem ? inspectorConfig.subtitle?.(selectedItem) : undefined}
        avatarText={selectedItem ? inspectorConfig.avatarText?.(selectedItem) : undefined}
        categoryLabel={selectedItem ? inspectorConfig.categoryLabel?.(selectedItem) : undefined}
        branchName={selectedItem ? inspectorConfig.branchName?.(selectedItem) : undefined}
        statusLabel={selectedItem ? inspectorConfig.statusLabel?.(selectedItem) : undefined}
        statusClassName={selectedItem ? inspectorConfig.statusClassName?.(selectedItem) : undefined}
        tabs={inspectorConfig.tabs}
        holdToDelete={false}
        onClose={() => onSelectItem(null)}
        onSelectItem={(it) => onSelectItem(it)}
        renderBody={(it, tab) => inspectorConfig.renderBody(it, tab)}
      />

      {extraFooter}
    </div>
  );
}
