import React, { useRef, useCallback } from 'react';
import { Check } from 'lucide-react';
import { KineticRow, KineticRowData } from './KineticRow';
import { KineticRowFanAction } from './KineticRowFan';
import { KineticDetailAction } from './KineticDetailIsland';
import { useKineticCollectionLayout } from './useKineticCollectionLayout';

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
  const defaultEmpty =
    emptyMessage ||
    (language === 'ar'
      ? 'لا توجد نتائج مطابقة. قم بتعديل البحث أو المرشحات.'
      : language === 'fr'
      ? 'Aucun élément ne correspond. Modifiez la recherche ou les filtres.'
      : 'No matching records. Adjust search or filters.');

  return (
    <div className="w-full">
      <div className="w-full members-x-wrap">
        <div
          className="w-full flex flex-col min-w-[980px] h-[560px] sm:h-[702px] relative"
          data-stage-mode={viewMode === 'grid' ? 'g' : 'l'}
        >
          {/* Floating 40px Inter SemiBold 13px Column Header Bar */}
          <div
            className="th th-adherents shrink-0 bg-white dark:bg-[#1C1B1A] border border-[var(--atr-line,#E6DED6)] dark:border-[#3A3734] text-black dark:text-white box-border select-none"
            data-v={viewMode === 'grid' ? 'g' : 'l'}
            aria-hidden={viewMode === 'grid'}
          >
            <button
              type="button"
              role="checkbox"
              data-no-liquid="true"
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
              className={`cb w-[22px] h-[22px] rounded-[7px] border-[1.5px] grid place-items-center p-0 cursor-pointer ${
                selectedCount === totalCount && totalCount > 0
                  ? 'bg-[var(--atr-acc,#d4522f)] border-[var(--atr-acc,#d4522f)] text-white'
                  : 'bg-white dark:bg-[#262422] border-[#D4C8BC] dark:border-[#5A5550] text-transparent hover:border-[var(--atr-acc,#d4522f)]'
              }`}
            >
              <Check
                className={`w-3.5 h-3.5 stroke-[3] transition-opacity duration-120 ${
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
                  className="text-left rtl:text-right font-['Inter',sans-serif] rtl:font-sans font-semibold text-[13px] tracking-[-0.018em] rtl:tracking-normal text-black dark:text-white flex items-center gap-1.5 cursor-pointer hover:text-[var(--atr-acc,#d4522f)] bg-transparent border-0 p-0 whitespace-nowrap truncate min-w-0 disabled:cursor-default disabled:hover:text-black dark:disabled:hover:text-white"
                >
                  <span className="truncate">{col.label}</span>
                  {isSortable && (
                    <i
                      className={`not-italic text-[11px] px-1.5 py-0.5 rounded-[5px] ${
                        isOn
                          ? 'bg-[var(--atr-hl,rgba(212,82,47,0.12))] text-[var(--atr-acc,#d4522f)]'
                          : 'bg-[var(--atr-bg,#F3EDE7)] dark:bg-[#2B2927] text-black dark:text-white/75'
                      }`}
                    >
                      {isOn ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                    </i>
                  )}
                </button>
              );
            })}
          </div>

          {/* Windowed Virtual Kinetic Stage */}
          <div
            ref={scrollContainerRef}
            className="scr relative mt-2.5 overflow-y-auto overflow-x-hidden pb-[70px] flex-1 min-h-0"
          >
            <div
              ref={rowsElRef}
              role="list"
              aria-label={ariaLabel}
              data-v={viewMode === 'grid' ? 'g' : 'l'}
              className="rows relative w-full"
            >
              {renderedRows.map((rowItem) => {
                const rowData = getRowData(rowItem.item);
                const rowId = rowItem.id;
                return (
                  <KineticRow
                    key={rowId}
                    row={rowData}
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
                    detailActions={getDetailActions ? getDetailActions(rowItem.item) : []}
                    detailChildren={
                      renderCustomRowDetail ? renderCustomRowDetail(rowItem.item) : undefined
                    }
                  />
                );
              })}
            </div>
            {items.length === 0 && (
              <p className="empty text-center text-black/68 dark:text-white/70 py-10">
                {defaultEmpty}
              </p>
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
