import React, { useState, useMemo } from 'react';
import {
  LayoutGrid,
  List,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  Trash2,
  Download,
} from 'lucide-react';
import { CollectionListRow, ActionButtonDef } from './CollectionListRow';
import { CollectionGridCard } from './CollectionGridCard';
import { CollectionEmptyState } from './CollectionEmptyState';
import { KebabMenuItem } from './CollectionKebabMenu';
import { SkeletonTable, SkeletonCardGrid } from '../skeleton/StructuralSkeletons';
import { SkeletonText, SkeletonBox } from '../skeleton/SkeletonPrimitives';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { useAtriumStore } from '../../../services/store';
import { LiveSegmentedControl, LiveButton } from '../live';

export interface ColumnDefinition<T> {
  key?: string;
  id?: string;
  header: string;
  width?: string; // e.g. "2.2*", "1.2*", "120px"
  minWidth?: string;
  sortable?: boolean;
  accessorKey?: string;
  renderCell?: (item: T, isSelected: boolean) => React.ReactNode;
  cell?: (item: T, isSelected?: boolean) => React.ReactNode;
}

export interface UniversalDataCollectionProps<T> {
  items?: T[];
  data?: T[];
  keyExtractor: (item: T) => string;
  defaultViewMode?: 'list' | 'grid' | 'calendar';
  columns: ColumnDefinition<T>[];
  renderCard?: (item: T, isSelected: boolean) => React.ReactNode;
  renderGridCard?: (item: T, isSelected?: boolean) => React.ReactNode;
  renderCalendarView?: () => React.ReactNode;

  // Row and Card Click
  onItemClick?: (item: T) => void;

  // Standard Actions
  onViewDetails?: (item: T) => void;
  onEdit?: (item: T) => void;
  onPay?: (item: T) => void;
  onToggleStatus?: (item: T) => void;
  onTogglePin?: (item: T) => void;
  onDelete?: (item: T) => void;
  customActions?: ((item: T) => ActionButtonDef[]) | ActionButtonDef[];
  extraKebabItems?: (item: T) => KebabMenuItem[];

  // Selection & Pin State
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  isPinned?: (item: T) => boolean;
  pinnedIds?: Set<string>;
  onPinToggle?: (itemOrId: any) => void;
  isActive?: (item: T) => boolean;

  // Bulk Actions
  bulkSecondaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: (selectedIds: Set<string>) => void;
    variant?: 'primary' | 'secondary' | 'warning' | 'default';
  };
  onBulkDelete?: (selectedIds: Set<string>) => void;
  bulkCustomActions?: {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: (selectedIds: Set<string>) => void;
  }[];

  // Sorting
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  sortDir?: 'asc' | 'desc';
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;

  // Search and Filters passthroughs
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filterValue?: string;
  onFilterChange?: (val: string) => void;
  filterOptions?: { value: string; label: string }[];
  viewMode?: 'list' | 'grid' | 'calendar';
  onViewModeChange?:
    | ((mode: 'list' | 'grid' | 'calendar') => void)
    | React.Dispatch<React.SetStateAction<'list' | 'grid'>>
    | React.Dispatch<React.SetStateAction<'list' | 'grid' | 'calendar'>>;

  // View Mode Switcher Header Control
  showViewToggle?: boolean;
  showCalendarToggle?: boolean;
  onCalendarClick?: () => void;
  headerActions?: React.ReactNode;

  // Empty State
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  primaryActionLabel?: string;
  onAddFirstItem?: () => void;
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;

  // Loading & Network Resilience
  isLoading?: boolean;
  isOffline?: boolean;
  isTimedOut?: boolean;
  lastSyncedAt?: string | null;
  onRetrySync?: () => Promise<void> | void;
  skeletonRowCount?: number;

  // Header & Search
  title?: string;
  subtitle?: string;
  searchFilter?: (item: T, query: string) => boolean;
  onSelectRow?: (item: T) => void;
}

export function UniversalDataCollection<T>({
  items,
  data,
  keyExtractor,
  defaultViewMode = 'list',
  columns,
  renderCard,
  renderGridCard,
  renderCalendarView,
  onItemClick,
  onViewDetails,
  onEdit,
  onPay,
  onToggleStatus,
  onTogglePin,
  onDelete,
  customActions,
  extraKebabItems,
  selectedIds,
  onSelectionChange,
  isPinned = () => false,
  pinnedIds,
  onPinToggle,
  isActive = () => true,
  bulkSecondaryAction,
  onBulkDelete,
  bulkCustomActions,
  sortBy,
  sortDirection = 'asc',
  sortDir,
  onSortChange,
  viewMode: controlledViewMode,
  onViewModeChange,
  showViewToggle = true,
  showCalendarToggle = false,
  onCalendarClick,
  headerActions,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  primaryActionLabel,
  onAddFirstItem,
  onResetFilters,
  hasActiveFilters = false,
  isLoading = false,
  isOffline = false,
  isTimedOut = false,
  lastSyncedAt,
  onRetrySync,
  skeletonRowCount = 6,
  title,
  subtitle,
  searchFilter,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  filterValue,
  onFilterChange,
  filterOptions,
  onSelectRow,
}: UniversalDataCollectionProps<T>) {
  const [internalViewMode, setInternalViewMode] = useState<'list' | 'grid' | 'calendar'>(defaultViewMode);
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const [internalSortBy, setInternalSortBy] = useState<string | undefined>(sortBy);
  const [internalSortDir, setInternalSortDir] = useState<'asc' | 'desc'>(sortDir || sortDirection || 'asc');

  const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;
  const setViewMode = (mode: 'list' | 'grid' | 'calendar') => {
    setInternalViewMode(mode);
    (onViewModeChange as any)?.(mode);
    if (mode === 'calendar' && onCalendarClick) {
      onCalendarClick();
    }
  };

  const effectiveSelectedIds = (selectedIds !== undefined && onSelectionChange) ? selectedIds : internalSelectedIds;

  const effectiveSortBy = sortBy !== undefined ? sortBy : internalSortBy;
  const effectiveSortDir = (sortDir || sortDirection) !== undefined ? (sortDir || sortDirection) : internalSortDir;

  const handleSort = (key: string, accessorKey?: string) => {
    const fieldKey = accessorKey || key;
    const nextDir = effectiveSortBy === fieldKey && effectiveSortDir === 'asc' ? 'desc' : 'asc';
    if (onSortChange) {
      (onSortChange as any)(fieldKey, nextDir);
    } else {
      setInternalSortBy(fieldKey);
      setInternalSortDir(nextDir);
    }
  };

  const effectiveSearchQuery = searchQuery !== undefined ? searchQuery : internalSearchQuery;
  let rawItems = items || data || [];
  if (searchFilter && effectiveSearchQuery.trim()) {
    rawItems = rawItems.filter((item) => searchFilter(item, effectiveSearchQuery));
  }

  // Resilient internal sorting fallback so all headers sort even without explicit parent handlers
  const sortedItems = useMemo(() => {
    if (onSortChange || !effectiveSortBy) return rawItems;
    return [...rawItems].sort((a: any, b: any) => {
      const colDef = columns.find(
        (c) => (c.key || c.id || c.accessorKey) === effectiveSortBy || c.accessorKey === effectiveSortBy
      );
      const field = colDef?.accessorKey || colDef?.key || colDef?.id || effectiveSortBy;
      const aVal = a?.[field] ?? '';
      const bVal = b?.[field] ?? '';
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return effectiveSortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return effectiveSortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [rawItems, onSortChange, effectiveSortBy, effectiveSortDir, columns]);

  const actualItems = sortedItems;

  const cardRenderer = (item: T, isSelected: boolean) => {
    if (renderCard) return renderCard(item, isSelected);
    if (renderGridCard) return renderGridCard(item, isSelected);
    return null;
  };

  const getCustomActions = (item: T): ActionButtonDef[] | undefined => {
    if (!customActions) return undefined;
    if (typeof customActions === 'function') {
      return customActions(item);
    }
    return customActions;
  };

  const checkPinned = (item: T): boolean => {
    const id = keyExtractor(item);
    if (pinnedIds) return pinnedIds.has(id);
    return isPinned(item);
  };

  const handleTogglePin = (item: T) => {
    const id = keyExtractor(item);
    if (onPinToggle) onPinToggle(id);
    else if (onTogglePin) onTogglePin(item);
  };

  // Multi-select select all calculation
  const allItemIds = useMemo(() => actualItems.map(keyExtractor), [actualItems, keyExtractor]);
  const isAllSelected = actualItems.length > 0 && allItemIds.every((id) => effectiveSelectedIds.has(id));
  const isPartiallySelected =
    actualItems.length > 0 && !isAllSelected && allItemIds.some((id) => effectiveSelectedIds.has(id));

  const handleToggleSelectAll = () => {
    const nextSet = isAllSelected ? new Set<string>() : new Set<string>(allItemIds);
    if (onSelectionChange) {
      onSelectionChange(nextSet);
    }
    setInternalSelectedIds(nextSet);
  };

  const handleToggleSelectItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(effectiveSelectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    if (onSelectionChange) {
      onSelectionChange(next);
    }
    setInternalSelectedIds(next);
  };

  const handleBulkDelete = () => {
    if (onBulkDelete) {
      onBulkDelete(effectiveSelectedIds);
    } else if (onDelete) {
      actualItems.forEach((item) => {
        const id = keyExtractor(item);
        if (effectiveSelectedIds.has(id)) {
          onDelete(item);
        }
      });
    }
    if (onSelectionChange) onSelectionChange(new Set());
    setInternalSelectedIds(new Set());
  };

  const handleDefaultSecondaryAction = () => {
    if (bulkSecondaryAction) {
      bulkSecondaryAction.onClick(effectiveSelectedIds);
      return;
    }
    // Default fallback: CSV Export of selected rows
    try {
      const selectedRows = actualItems.filter((item) => effectiveSelectedIds.has(keyExtractor(item)));
      if (selectedRows.length === 0) return;
      const headers = columns.map((c) => c.header).join(',');
      const rows = selectedRows.map((item: any) =>
        columns
          .map((c) => {
            const val = item[c.accessorKey || c.key || c.id || ''] ?? '';
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',')
      );
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `selection_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const store = useAtriumStore();
  const effectiveIsLoading = isLoading !== undefined ? isLoading : (store.isSyncing || store.networkMode === 'force_skeleton');
  const effectiveIsOffline = isOffline !== undefined ? isOffline : (store.networkMode === 'offline');
  const effectiveIsTimedOut = isTimedOut !== undefined ? isTimedOut : store.isSyncTimeout;
  const effectiveLastSyncedAt = lastSyncedAt !== undefined ? lastSyncedAt : store.lastSyncedAt;
  const effectiveOnRetrySync = onRetrySync !== undefined ? onRetrySync : store.retryCloudSync;

  const shouldRenderSkeleton = (effectiveIsLoading && actualItems.length === 0) || store.networkMode === 'force_skeleton';

  // Render Loading Skeleton State (Cold Start / No Cached Data OR Force Skeleton)
  if (shouldRenderSkeleton) {
    return (
      <div className="w-full flex flex-col">
        <OfflineRetryBanner
          isOffline={effectiveIsOffline}
          isTimedOut={effectiveIsTimedOut}
          lastSyncedAt={effectiveLastSyncedAt}
          onRetry={effectiveOnRetrySync}
        />

        {title && (
          <div className="flex items-center justify-between pb-3">
            <div className="space-y-1">
              <SkeletonText size="sm" width="160px" />
              {subtitle && <SkeletonText size="xs" width="220px" />}
            </div>
            {showViewToggle && (
              <SkeletonBox width={72} height={32} rounded="rounded-xl" />
            )}
          </div>
        )}

        {viewMode === 'list' ? (
          <SkeletonTable
            columns={columns.map((c) => ({
              width: c.width,
              minWidth: c.minWidth,
              header: c.header,
            }))}
            rowCount={skeletonRowCount}
            showHeaderControls={true}
          />
        ) : (
          <SkeletonCardGrid count={skeletonRowCount} />
        )}
      </div>
    );
  }

  // Render Empty State
  if (actualItems.length === 0) {
    return (
      <div className="w-full flex flex-col">
        <OfflineRetryBanner
          isOffline={effectiveIsOffline}
          isTimedOut={effectiveIsTimedOut}
          lastSyncedAt={effectiveLastSyncedAt}
          onRetry={effectiveOnRetrySync}
        />

        {/* Optional View Switcher Bar Even When Empty */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">{headerActions}</div>
          {showViewToggle && (
            <LiveSegmentedControl
              options={[
                { value: 'list', icon: <List className="w-3.5 h-3.5" />, 'aria-label': 'List View' },
                { value: 'grid', icon: <LayoutGrid className="w-3.5 h-3.5" />, 'aria-label': 'Grid View' },
                ...(showCalendarToggle
                  ? [{ value: 'calendar', icon: <Calendar className="w-3.5 h-3.5" />, 'aria-label': 'Calendar View' }]
                  : []),
              ]}
              value={viewMode}
              onValueChange={(val) => setViewMode(val as any)}
              aria-label="View Mode"
            />
          )}
        </div>

        <CollectionEmptyState
          title={emptyTitle}
          description={emptyDescription}
          icon={emptyIcon}
          primaryActionLabel={primaryActionLabel}
          onPrimaryAction={onAddFirstItem}
          onResetFilters={onResetFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col relative">
      {/* Offline / Delayed Retry Banner */}
      <OfflineRetryBanner
        isOffline={effectiveIsOffline}
        isTimedOut={effectiveIsTimedOut}
        lastSyncedAt={effectiveLastSyncedAt}
        onRetry={effectiveOnRetrySync}
      />

      {/* ================= TOP VIEW SWITCHER / HEADER CONTROLS ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
        {title ? (
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">{title}</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-mono">
                {actualItems.length}
              </span>
              {effectiveIsLoading && (
                <span className="text-[11px] text-[#C4785A] dark:text-[#E09070] font-medium animate-pulse">
                  Syncing...
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {headerActions}
            {effectiveIsLoading && (
              <span className="text-[11px] text-[#C4785A] dark:text-[#E09070] font-medium animate-pulse ml-2">
                Syncing...
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2.5 ml-auto">
          {searchFilter && (
            <div className="w-56">
              <input
                type="text"
                placeholder={searchPlaceholder || 'Rechercher...'}
                value={effectiveSearchQuery}
                onChange={(e) => {
                  setInternalSearchQuery(e.target.value);
                  onSearchChange?.(e.target.value);
                }}
                className="w-full h-8 px-3 rounded-xl text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
              />
            </div>
          )}

          {showViewToggle && (
            <LiveSegmentedControl
              options={[
                { value: 'list', icon: <List className="w-3.5 h-3.5" />, 'aria-label': 'List View' },
                { value: 'grid', icon: <LayoutGrid className="w-3.5 h-3.5" />, 'aria-label': 'Grid View' },
                ...(showCalendarToggle
                  ? [{ value: 'calendar', icon: <Calendar className="w-3.5 h-3.5" />, 'aria-label': 'Calendar View' }]
                  : []),
              ]}
              value={viewMode}
              onValueChange={(val) => setViewMode(val as any)}
              aria-label="View Mode"
            />
          )}
        </div>
      </div>

      {/* ================= LIST VIEW ================= */}
      {viewMode === 'list' && (
        <div className="w-full flex flex-col">
          {/* Column Headers Bar (Wrapped in White Container Floating on Grey Pod) */}
          <div className="w-full bg-white dark:bg-[#18181B] border border-neutral-200/90 dark:border-neutral-800 rounded-[12px] px-4 py-2.5 mb-2.5 flex items-center shadow-xs">
            {/* Column 0: Multi-select master checkbox */}
            <div className="w-[38px] shrink-0 flex items-center pr-1">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                  isAllSelected
                    ? 'bg-[#C4785A] border-[#C4785A] text-white'
                    : isPartiallySelected
                    ? 'bg-[#C4785A]/30 border-[#C4785A] text-white'
                    : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400'
                }`}
                title="Tout sélectionner"
              >
                {(isAllSelected || isPartiallySelected) && (
                  <Check className="w-3 h-3 stroke-[3]" />
                )}
              </button>
            </div>

            {/* Column Headers */}
            <div className="flex-1 flex items-center gap-3 overflow-hidden">
              {columns.map((col, idx) => {
                const colKey = col.key || col.id || col.accessorKey || `hdr_${idx}`;
                const isCurrentSort = effectiveSortBy === colKey || effectiveSortBy === col.accessorKey;
                const isSortable = col.sortable !== false; // Enabled for all columns by default

                return (
                  <div
                    key={colKey}
                    style={{
                      flex: col.width?.includes('*')
                        ? col.width.replace('*', '')
                        : undefined,
                      width: !col.width?.includes('*') ? col.width : undefined,
                      minWidth: col.minWidth || '90px',
                    }}
                    className="flex items-center gap-1.5"
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(colKey, col.accessorKey)}
                        className="group flex items-center gap-1.5 text-[12px] font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer select-none"
                      >
                        <span className="truncate">{col.header}</span>
                        {/* Sort arrow badge pill */}
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-[5px] transition-colors ${
                            isCurrentSort
                              ? 'bg-[#C4785A]/15 text-[#C4785A]'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200'
                          }`}
                        >
                          {isCurrentSort ? (
                            effectiveSortDir === 'asc' ? (
                              <ArrowUp className="w-2.5 h-3 text-[#C4785A] stroke-[2.5]" />
                            ) : (
                              <ArrowDown className="w-2.5 h-3 text-[#C4785A] stroke-[2.5]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-2.5 h-3" />
                          )}
                        </span>
                      </button>
                    ) : (
                      <span className="text-[12px] font-semibold text-neutral-600 dark:text-neutral-300 truncate">
                        {col.header}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Column 5: Kebab header placeholder */}
            <div className="w-[36px] shrink-0" />
          </div>

          {/* Scrollable list of row cards floating on grey background */}
          <div className="flex flex-col">
            {actualItems.map((item, idx) => {
              const id = keyExtractor(item) || (item as any)?.id || `item_${idx}`;
              const isSelected = effectiveSelectedIds.has(id);
              const pinned = checkPinned(item);
              const active = isActive(item);

              return (
                <CollectionListRow
                  key={id}
                  id={id}
                  isSelected={isSelected}
                  isPinned={pinned}
                  isActive={active}
                  onRowClick={() => (onItemClick || onSelectRow)?.(item)}
                  onViewDetails={onViewDetails ? () => onViewDetails(item) : undefined}
                  onEdit={onEdit ? () => onEdit(item) : undefined}
                  onToggleStatus={onToggleStatus ? () => onToggleStatus(item) : undefined}
                  onTogglePin={() => handleTogglePin(item)}
                  onDelete={onDelete ? () => onDelete(item) : undefined}
                  customActions={getCustomActions(item)}
                  extraKebabItems={extraKebabItems ? extraKebabItems(item) : undefined}
                >
                  {/* Column 0: Multi-select row checkbox */}
                  <div className="w-[38px] shrink-0 flex items-center pr-1">
                    <button
                      type="button"
                      onClick={(e) => handleToggleSelectItem(id, e)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#C4785A] border-[#C4785A] text-white'
                          : 'border-neutral-300 dark:border-neutral-600 hover:border-[#C4785A]'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  </div>

                  {/* Render Columns */}
                  {columns.map((col, idx) => {
                    const colKey = col.key || col.id || col.accessorKey || `col_${idx}`;
                    const cellContent = col.renderCell
                      ? col.renderCell(item, isSelected)
                      : col.cell
                      ? col.cell(item, isSelected)
                      : null;

                    return (
                      <div
                        key={colKey}
                        style={{
                          flex: col.width?.includes('*')
                            ? col.width.replace('*', '')
                            : undefined,
                          width: !col.width?.includes('*') ? col.width : undefined,
                          minWidth: col.minWidth || '90px',
                        }}
                        className="overflow-hidden flex items-center"
                      >
                        {cellContent}
                      </div>
                    );
                  })}
                </CollectionListRow>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= GRID / CARD VIEW ================= */}
      {viewMode === 'grid' && (
        <div className="w-full flex flex-wrap items-start">
          {actualItems.map((item, idx) => {
            const id = keyExtractor(item) || (item as any)?.id || `grid_item_${idx}`;
            const isSelected = effectiveSelectedIds.has(id);
            const pinned = checkPinned(item);
            const active = isActive(item);

            return (
              <CollectionGridCard
                key={id}
                id={id}
                isSelected={isSelected}
                isPinned={pinned}
                isActive={active}
                onCardClick={() => (onItemClick || onSelectRow)?.(item)}
                onViewDetails={onViewDetails ? () => onViewDetails(item) : undefined}
                onEdit={onEdit ? () => onEdit(item) : undefined}
                onPay={onPay ? () => onPay(item) : undefined}
                onToggleStatus={onToggleStatus ? () => onToggleStatus(item) : undefined}
                onTogglePin={() => handleTogglePin(item)}
                onDelete={onDelete ? () => onDelete(item) : undefined}
                customActions={getCustomActions(item)}
              >
                {cardRenderer(item, isSelected)}
              </CollectionGridCard>
            );
          })}
        </div>
      )}

      {/* ================= CALENDAR / TIMELINE VIEW ================= */}
      {viewMode === 'calendar' && renderCalendarView && (
        <div className="w-full">
          {renderCalendarView()}
        </div>
      )}

      {/* ================= FLOATING BULK SELECTION ACTION TOOLBAR ================= */}
      {effectiveSelectedIds.size > 0 && (
        <div data-atrium-bulk-toolbar="true" className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 dark:bg-neutral-850/95 backdrop-blur-md text-white rounded-2xl px-5 py-3 shadow-2xl border border-neutral-700/60 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 pr-3 border-r border-neutral-700/80">
            <span className="w-5 h-5 rounded-full bg-[#C4785A] text-white text-xs font-bold flex items-center justify-center font-mono">
              {effectiveSelectedIds.size}
            </span>
            <span className="text-xs font-medium text-neutral-200 whitespace-nowrap">
              {effectiveSelectedIds.size === 1 ? '1 sélectionné' : `${effectiveSelectedIds.size} sélectionnés`}
            </span>
          </div>

          {/* Secondary Action button (Category specific or export fallback) */}
          {bulkSecondaryAction ? (
            <button
              type="button"
              onClick={() => bulkSecondaryAction.onClick(effectiveSelectedIds)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border shadow-2xs ${
                bulkSecondaryAction.variant === 'warning'
                  ? 'bg-amber-500 hover:bg-amber-600 text-neutral-950 border-amber-400 font-bold'
                  : bulkSecondaryAction.variant === 'primary'
                  ? 'bg-[#C4785A] hover:bg-[#B3684A] text-white border-[#C4785A]'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border-neutral-700'
              }`}
            >
              {bulkSecondaryAction.icon}
              <span>{bulkSecondaryAction.label}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDefaultSecondaryAction}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-100 flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700 shadow-2xs"
              title="Exporter la sélection en CSV"
            >
              <Download size={13} />
              <span>Exporter sélection</span>
            </button>
          )}

          {/* Custom extra bulk actions if provided */}
          {bulkCustomActions?.map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => act.onClick(effectiveSelectedIds)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-100 flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700 shadow-2xs"
            >
              {act.icon}
              <span>{act.label}</span>
            </button>
          ))}

          {/* Delete Action button (Always present) */}
          <button
            type="button"
            onClick={handleBulkDelete}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            title="Supprimer la sélection"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Supprimer</span>
          </button>

          {/* Cancel button */}
          <button
            type="button"
            onClick={() => {
              if (onSelectionChange) onSelectionChange(new Set());
              setInternalSelectedIds(new Set());
            }}
            className="text-xs text-neutral-400 hover:text-white px-2 py-1 transition-colors cursor-pointer ml-1"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
