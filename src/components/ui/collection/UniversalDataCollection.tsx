import React, { useState, useMemo } from 'react';
import {
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
} from 'lucide-react';
import { CollectionListRow, ActionButtonDef } from './CollectionListRow';
import { CollectionGridCard } from './CollectionGridCard';
import { CollectionEmptyState } from './CollectionEmptyState';
import { KebabMenuItem } from './CollectionKebabMenu';

export interface ColumnDefinition<T> {
  key: string;
  header: string;
  width?: string; // e.g. "2.2*", "1.2*", "120px"
  minWidth?: string;
  sortable?: boolean;
  renderCell: (item: T, isSelected: boolean) => React.ReactNode;
}

export interface UniversalDataCollectionProps<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  defaultViewMode?: 'list' | 'grid';
  columns: ColumnDefinition<T>[];
  renderCard: (item: T, isSelected: boolean) => React.ReactNode;

  // Row and Card Click
  onItemClick?: (item: T) => void;

  // Standard Actions
  onViewDetails?: (item: T) => void;
  onEdit?: (item: T) => void;
  onPay?: (item: T) => void;
  onToggleStatus?: (item: T) => void;
  onTogglePin?: (item: T) => void;
  onDelete?: (item: T) => void;
  customActions?: (item: T) => ActionButtonDef[];
  extraKebabItems?: (item: T) => KebabMenuItem[];

  // Selection & Pin State
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  isPinned?: (item: T) => boolean;
  isActive?: (item: T) => boolean;

  // Sorting
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (columnKey: string) => void;

  // View Mode Switcher Header Control
  showViewToggle?: boolean;
  headerActions?: React.ReactNode;

  // Empty State
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  primaryActionLabel?: string;
  onAddFirstItem?: () => void;
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
}

export function UniversalDataCollection<T>({
  items,
  keyExtractor,
  defaultViewMode = 'list',
  columns,
  renderCard,
  onItemClick,
  onViewDetails,
  onEdit,
  onPay,
  onToggleStatus,
  onTogglePin,
  onDelete,
  customActions,
  extraKebabItems,
  selectedIds = new Set<string>(),
  onSelectionChange,
  isPinned = () => false,
  isActive = () => true,
  sortBy,
  sortDirection = 'asc',
  onSortChange,
  showViewToggle = true,
  headerActions,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  primaryActionLabel,
  onAddFirstItem,
  onResetFilters,
  hasActiveFilters = false,
}: UniversalDataCollectionProps<T>) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(defaultViewMode);

  // Multi-select select all calculation
  const allItemIds = useMemo(() => items.map(keyExtractor), [items, keyExtractor]);
  const isAllSelected = items.length > 0 && allItemIds.every((id) => selectedIds.has(id));
  const isPartiallySelected =
    items.length > 0 && !isAllSelected && allItemIds.some((id) => selectedIds.has(id));

  const handleToggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (isAllSelected) {
      onSelectionChange(new Set<string>());
    } else {
      onSelectionChange(new Set<string>(allItemIds));
    }
  };

  const handleToggleSelectItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  // Render Empty State
  if (items.length === 0) {
    return (
      <div className="w-full flex flex-col">
        {/* Optional View Switcher Bar Even When Empty */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">{headerActions}</div>
          {showViewToggle && (
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-[#C4785A] text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-[#C4785A] text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
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
    <div className="w-full flex flex-col">
      {/* ================= TOP VIEW SWITCHER / HEADER CONTROLS ================= */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">{headerActions}</div>

        {showViewToggle && (
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-0.5 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#C4785A] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#C4785A] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ================= LIST VIEW ================= */}
      {viewMode === 'list' && (
        <div className="w-full flex flex-col">
          {/* Column Headers Bar (Sticky Floating Card) */}
          <div className="w-full bg-white dark:bg-[#18181B] border border-neutral-200/90 dark:border-neutral-800 rounded-[12px] px-4 py-2.5 mb-2 flex items-center shadow-xs">
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
                title="Select all"
              >
                {(isAllSelected || isPartiallySelected) && (
                  <Check className="w-3 h-3 stroke-[3]" />
                )}
              </button>
            </div>

            {/* Column Headers */}
            <div className="flex-1 flex items-center gap-3 overflow-hidden">
              {columns.map((col) => {
                const isCurrentSort = sortBy === col.key;

                return (
                  <div
                    key={col.key}
                    style={{
                      flex: col.width?.includes('*')
                        ? col.width.replace('*', '')
                        : undefined,
                      width: !col.width?.includes('*') ? col.width : undefined,
                      minWidth: col.minWidth || '90px',
                    }}
                    className="flex items-center gap-1.5"
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => onSortChange?.(col.key)}
                        className="group flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
                      >
                        <span className="truncate">{col.header}</span>
                        {/* Sort arrow badge pill */}
                        <span className="inline-flex items-center px-1 py-0.5 rounded-[5px] bg-neutral-100 dark:bg-neutral-800 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors">
                          {isCurrentSort ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-2.5 h-3 text-[#C4785A]" />
                            ) : (
                              <ArrowDown className="w-2.5 h-3 text-[#C4785A]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-2.5 h-3" />
                          )}
                        </span>
                      </button>
                    ) : (
                      <span className="text-[12px] font-semibold text-neutral-500 dark:text-neutral-400 truncate">
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

          {/* Scrollable list of row cards */}
          <div className="flex flex-col">
            {items.map((item) => {
              const id = keyExtractor(item);
              const isSelected = selectedIds.has(id);
              const pinned = isPinned(item);
              const active = isActive(item);

              return (
                <CollectionListRow
                  key={id}
                  id={id}
                  isSelected={isSelected}
                  isPinned={pinned}
                  isActive={active}
                  onRowClick={() => onItemClick?.(item)}
                  onViewDetails={onViewDetails ? () => onViewDetails(item) : undefined}
                  onEdit={onEdit ? () => onEdit(item) : undefined}
                  onToggleStatus={onToggleStatus ? () => onToggleStatus(item) : undefined}
                  onTogglePin={onTogglePin ? () => onTogglePin(item) : undefined}
                  onDelete={onDelete ? () => onDelete(item) : undefined}
                  customActions={customActions ? customActions(item) : undefined}
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
                  {columns.map((col) => (
                    <div
                      key={col.key}
                      style={{
                        flex: col.width?.includes('*')
                          ? col.width.replace('*', '')
                          : undefined,
                        width: !col.width?.includes('*') ? col.width : undefined,
                        minWidth: col.minWidth || '90px',
                      }}
                      className="overflow-hidden flex items-center"
                    >
                      {col.renderCell(item, isSelected)}
                    </div>
                  ))}
                </CollectionListRow>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= GRID / CARD VIEW ================= */}
      {viewMode === 'grid' && (
        <div className="w-full flex flex-wrap items-start">
          {items.map((item) => {
            const id = keyExtractor(item);
            const isSelected = selectedIds.has(id);
            const pinned = isPinned(item);
            const active = isActive(item);

            return (
              <CollectionGridCard
                key={id}
                id={id}
                isSelected={isSelected}
                isPinned={pinned}
                isActive={active}
                onCardClick={() => onItemClick?.(item)}
                onViewDetails={onViewDetails ? () => onViewDetails(item) : undefined}
                onEdit={onEdit ? () => onEdit(item) : undefined}
                onPay={onPay ? () => onPay(item) : undefined}
                onToggleStatus={onToggleStatus ? () => onToggleStatus(item) : undefined}
                onTogglePin={onTogglePin ? () => onTogglePin(item) : undefined}
                onDelete={onDelete ? () => onDelete(item) : undefined}
                customActions={customActions ? customActions(item) : undefined}
              >
                {renderCard(item, isSelected)}
              </CollectionGridCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
