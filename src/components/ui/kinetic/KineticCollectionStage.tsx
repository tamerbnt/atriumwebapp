import React, { useRef, useCallback } from 'react';
import { Check } from 'lucide-react';
import {
  EmptyState,
  EMPTY_STATE_ICONS,
  type EmptyStateProps,
} from '../../../atrium/components/EmptyState';
import { KineticRow, KineticRowData } from './KineticRow';
import { KineticRowFanAction } from './KineticRowFan';
import { KineticDetailAction } from './KineticDetailIsland';
import { useKineticCollectionLayout } from './useKineticCollectionLayout';
import { KineticEmptyStateMotion } from './KineticEmptyStateMotion';

const EMPTY_DETAIL_ACTIONS: KineticDetailAction[] = [];

export interface KineticColumnHeader {
  key: string;
  label: string;
  sortable?: boolean;
}

export interface KineticCollectionStageProps<T> {
  items: readonly T[];
  keyExtractor: (item: T) => string;
  columns: readonly KineticColumnHeader[]; // Expected 5 columns: [Identity, Category, Status, Metric, Branch]
  getRowData: (item: T) => KineticRowData;
  viewMode: 'list' | 'grid';
  filterKey: string;
  expandedIds: ReadonlySet<string>;
  selectedIds: ReadonlySet<string>;
  pinnedIds?: ReadonlySet<string>;
  openItemId?: string | null;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  language?: string;
  ariaLabel?: string;
  emptyMessage?: string;
  emptyState?: EmptyStateProps | React.ReactNode;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onPruneSelection?: (hiddenIds: string[]) => void;
  onToggleSelectAll: () => void;
  onToggleSort: (colKey: string) => void;
  onSelectRow: (id: string, e: React.MouseEvent) => void;
  onToggleExpand: (id: string) => void;
  onOpenDetails: (id: string, originEl?: HTMLElement | null) => void;
  onEdit?: (id: string, originEl?: HTMLElement | null) => void;
  onSecondaryAction?: (id: string, originEl?: HTMLElement | null) => void;
  secondaryIcon?: React.ReactNode;
  secondaryLabel?: string;
  onDelete?: (id: string) => void;
  getFanActions?: (item: T) => KineticRowFanAction[] | undefined;
  getDetailActions?: (item: T) => KineticDetailAction[];
  renderCustomRowDetail?: (item: T) => React.ReactNode;
}

function KineticCollectionStageInner<T>({
  items,
  keyExtractor,
  columns,
  getRowData,
  viewMode,
  filterKey,
  expandedIds,
  selectedIds,
  pinnedIds,
  openItemId,
  sortBy,
  sortDir,
  language = 'fr',
  ariaLabel = 'Collection',
  emptyMessage,
  emptyState,
  scrollContainerRef: externalScrollRef,
  onPruneSelection,
  onToggleSelectAll,
  onToggleSort,
  onSelectRow,
  onToggleExpand,
  onOpenDetails,
  onEdit,
  onSecondaryAction,
  secondaryIcon,
  secondaryLabel,
  onDelete,
  getFanActions,
  getDetailActions,
  renderCustomRowDetail,
}: KineticCollectionStageProps<T>) {
  const internalScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = externalScrollRef || internalScrollRef;
  const rowsElRef = useRef<HTMLDivElement | null>(null);

  const handleFilterScrollReset = useCallback(() => {
    const scr = scrollContainerRef.current;
    if (scr && scr.scrollTop > 0) scr.scrollTop = 0;
  }, [scrollContainerRef]);

  const { renderedRows, registerRowRefs } = useKineticCollectionLayout<T>({
    items,
    keyExtractor,
    expandedIds,
    viewMode,
    filterKey,
    rowsElRef,
    scrollContainerRef,
    openItemId,
    onPruneSelection,
    onFilterChange: handleFilterScrollReset,
  });

  const selectedCount = selectedIds.size;
  const totalCount = items.length;
  const isEmpty = totalCount === 0;
  const defaultEmpty =
    emptyMessage ||
    (language === 'ar'
      ? 'لا توجد نتائج مطابقة. قم بتعديل البحث أو المرشحات.'
      : language === 'fr'
      ? 'Aucun élément ne correspond. Modifiez la recherche ou les filtres.'
      : 'No matching records. Adjust search or filters.');

  const headerBar = (
    <div
      data-sq="row"
      data-sq-border="solid"
      className="th th-adherents relative shrink-0 bg-white dark:bg-[#22201E] text-black dark:text-white box-border select-none"
      data-v={viewMode === 'grid' ? 'g' : 'l'}
      aria-hidden={viewMode === 'grid'}
    >
      <button
        type="button"
        role="checkbox"
        data-no-liquid="true"
        data-sq="check"
        data-sq-border="solid"
        data-sq-stroke-w="1.5"
        tabIndex={viewMode === 'grid' ? -1 : 0}
        aria-checked={
          selectedCount === 0
            ? 'false'
            : selectedCount === totalCount && totalCount > 0
            ? 'true'
            : 'mixed'
        }
        aria-label={
          language === 'ar'
            ? 'تحديد الكل'
            : language === 'fr'
            ? 'Tout sélectionner'
            : 'Select all'
        }
        onClick={onToggleSelectAll}
        className={`cb relative w-[var(--check,20px)] h-[var(--check,20px)] grid place-items-center p-0 cursor-pointer ${
          selectedCount === totalCount && totalCount > 0
            ? 'bg-[var(--brand-fill)] [--sq-stroke:var(--brand-fill)] text-white'
            : 'bg-white dark:bg-[#2B2825] [--sq-stroke:rgba(23,19,15,0.12)] dark:[--sq-stroke:rgba(255,255,255,0.16)] hover:[--sq-stroke:var(--brand-text)] text-transparent'
        }`}
      >
        <Check
          size={12}
          strokeWidth={2}
          className={`transition-opacity duration-120 ${
            selectedCount > 0 ? 'opacity-100 text-white' : 'opacity-0'
          }`}
        />
      </button>

      {columns.slice(0, 5).map((col) => {
        const isOn = sortBy === col.key;
        const isSortable = col.sortable !== false;
        return (
          <button
            key={col.key}
            type="button"
            data-no-liquid="true"
            data-k={col.key}
            data-on={isOn ? 'true' : undefined}
            tabIndex={viewMode === 'grid' ? -1 : 0}
            disabled={!isSortable}
            aria-sort={isOn ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
            onClick={() => isSortable && onToggleSort(col.key)}
            className="text-start t-small text-[var(--text-2)] dark:text-[var(--text-dark-2)] flex items-center gap-[var(--s2,8px)] cursor-pointer hover:text-[var(--brand-text)] dark:hover:text-[var(--brand-on-dark)] bg-transparent border-0 p-0 whitespace-nowrap truncate min-w-0 disabled:cursor-default disabled:hover:text-[var(--text-2)]"
          >
            <span className="truncate">{col.label}</span>
            {isSortable && (
              <i
                className={`not-italic t-small px-[var(--s2,8px)] h-[var(--badge-h,22px)] inline-flex items-center rounded-full ${
                  isOn
                    ? 'bg-[var(--atr-hl,rgba(212,82,47,0.12))] text-[var(--brand-text)] dark:text-[var(--brand-on-dark)]'
                    : 'bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#2B2927] text-[var(--text-2)] dark:text-[var(--text-dark-2)]'
                }`}
              >
                {isOn ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
              </i>
            )}
          </button>
        );
      })}
    </div>
  );

  const showRowsStage = !isEmpty || renderedRows.length > 0;
  const emptyTone =
    isEmpty && emptyState && typeof emptyState === 'object' && 'tone' in emptyState
      ? (emptyState as EmptyStateProps).tone ?? 'neutral'
      : 'neutral';
  const emptyTitle =
    isEmpty && emptyState && typeof emptyState === 'object' && 'title' in emptyState
      ? String((emptyState as EmptyStateProps).title)
      : '';
  const emptyKey = `${emptyTone}-${emptyTitle}`;

  return (
    <div className="w-full">
      <div className="w-full members-x-wrap">
        <div
          className={`w-full flex flex-col gap-[var(--row-gap,8px)] h-[560px] sm:h-[702px] relative ${
            viewMode === 'list' && showRowsStage ? 'min-w-[980px]' : 'min-w-0'
          }`}
          data-stage-mode={viewMode === 'grid' ? 'g' : 'l'}
        >
          {headerBar}

          {/* Windowed Virtual Kinetic Stage — stays mounted across empty/non-empty filter transitions */}
          <div
            ref={scrollContainerRef}
            data-no-rubber-band="true"
            className={`scr relative flex-1 min-h-0 pb-[70px] overscroll-auto ${
              showRowsStage ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden min-h-[350px]'
            }`}
          >
            <div
              ref={rowsElRef}
              role="list"
              aria-label={ariaLabel}
              data-v={viewMode === 'grid' ? 'g' : 'l'}
              className={`rows relative w-full ${isEmpty ? 'pointer-events-none' : ''}`}
            >
              {renderedRows.map((rowItem) => {
                const rowData = getRowData(rowItem.item);
                const rowId = rowItem.id;
                return (
                  <KineticRow
                    key={rowId}
                    row={rowData}
                    viewMode={viewMode}
                    isSelected={selectedIds.has(rowId)}
                    isOpen={openItemId === rowId}
                    isExpanded={expandedIds.has(rowId)}
                    isPinned={pinnedIds?.has(rowId) ?? rowData.isPinned}
                    registerRowRefs={registerRowRefs}
                    onSelect={onSelectRow}
                    onToggleExpand={onToggleExpand}
                    onOpenDetails={onOpenDetails}
                    onEdit={onEdit}
                    onSecondaryAction={onSecondaryAction}
                    secondaryIcon={secondaryIcon}
                    secondaryLabel={secondaryLabel}
                    onDelete={onDelete}
                    fanActions={getFanActions ? getFanActions(rowItem.item) : undefined}
                    detailActions={
                      getDetailActions ? getDetailActions(rowItem.item) : EMPTY_DETAIL_ACTIONS
                    }
                    detailChildren={
                      renderCustomRowDetail ? renderCustomRowDetail(rowItem.item) : undefined
                    }
                  />
                );
              })}
            </div>

            {isEmpty && (
              <div className="absolute inset-0 z-[5] flex flex-col min-w-0 min-h-[350px]">
                <KineticEmptyStateMotion motionKey={emptyKey}>
                  {React.isValidElement(emptyState) ? (
                    emptyState
                  ) : emptyState && typeof emptyState === 'object' && 'title' in emptyState ? (
                    <EmptyState {...(emptyState as EmptyStateProps)} />
                  ) : (
                    <EmptyState
                      variant="island"
                      tone="neutral"
                      icon={<EMPTY_STATE_ICONS.Funnel />}
                      title={defaultEmpty}
                    />
                  )}
                </KineticEmptyStateMotion>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const KineticCollectionStage = React.memo(
  KineticCollectionStageInner
) as typeof KineticCollectionStageInner;
