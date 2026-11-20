import React, { useState, useMemo, useCallback, useRef, useContext, useSyncExternalStore } from 'react';
import {
  Eye,
  Pencil,
  CreditCard,
  Pin,
  Trash2,
  Power,
  Building2,
  Check,
  Calendar,
} from 'lucide-react';
import { ActionButtonDef } from './CollectionListRow';
import { CollectionEmptyState } from './CollectionEmptyState';
import { KebabMenuItem } from './CollectionKebabMenu';
import { SkeletonTable, SkeletonCardGrid } from '../skeleton/StructuralSkeletons';
import { SkeletonText, SkeletonBox } from '../skeleton/SkeletonPrimitives';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import {
  useAtriumSelector,
  shallowEqualObjects,
  retryCloudSyncAction,
} from '../../../services/store';
import {
  ScreenCollectionToolbar,
  ActiveFilterChip,
} from '../kinetic/ScreenCollectionToolbar';
import { ScreenPodBridgeContext } from '../kinetic/ScreenPod';
import {
  KineticCollectionStage,
  KineticColumnHeader,
} from '../kinetic/KineticCollectionStage';
import {
  KineticRowData,
  KineticStatusVariant,
  computeInitialsColor,
  extractInitials,
  inferStatusVariant,
} from '../kinetic/KineticRow';
import { KineticRowFanAction } from '../kinetic/KineticRowFan';
import { KineticDetailAction } from '../kinetic/KineticDetailIsland';
import {
  KineticFloatingBulkBar,
  KineticBulkAction,
} from '../kinetic/KineticFloatingBulkBar';
import {
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../kinetic/branchUtils';
import { mapLegacyColumnsToKineticSlots } from '../kinetic/kineticMath';

export interface ColumnDefinition<T> {
  key?: string;
  id?: string;
  header: string;
  width?: string; // Legacy flex hint; Stage uses unified 6-track kinetic grid
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
  renderRow?: (item: T, isSelected: boolean, isPinned: boolean) => React.ReactNode;

  // Row and Card Click
  onItemClick?: (item: T, openerEl?: HTMLElement | null) => void;

  // Standard Actions
  onViewDetails?: (item: T, openerEl?: HTMLElement | null) => void;
  onEdit?: (item: T, openerEl?: HTMLElement | null) => void;
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
  filterOptions?: { value: string; label: string; tooltip?: string; count?: number | string }[];
  viewMode?: 'list' | 'grid' | 'calendar';
  onViewModeChange?:
    | ((mode: 'list' | 'grid' | 'calendar') => void)
    | React.Dispatch<React.SetStateAction<'list' | 'grid'>>
    | React.Dispatch<React.SetStateAction<'list' | 'grid' | 'calendar'>>;

  // View Mode Switcher & Unified Toolbar Controls
  showViewToggle?: boolean;
  showCalendarToggle?: boolean;
  onCalendarClick?: () => void;
  headerActions?: React.ReactNode;
  hideToolbar?: boolean;
  onToggleFilterModal?: () => void;
  hasActiveAdvancedFilters?: boolean;
  activeFiltersCount?: number;
  isFilterModalOpen?: boolean;
  filterButtonRef?: React.Ref<HTMLButtonElement>;
  onExport?: () => void | Promise<void>;
  exportFilename?: string;
  activeChips?: ActiveFilterChip[];
  openItemId?: string | null;

  // Optional Kinetic Slot Overrides
  getRowMeta?: (item: T) => Partial<KineticRowData>;
  getFanActions?: (item: T) => KineticRowFanAction[] | undefined;
  getDetailActions?: (item: T) => KineticDetailAction[];

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
  onSelectRow?: (item: T, openerEl?: HTMLElement | null) => void;

  // Bounded Windowing & Load More Pagination
  pageSize?: number;
  totalCount?: number;
  hasMoreRemote?: boolean;
  onLoadMore?: () => Promise<void> | void;
  isLoadingMore?: boolean;
  loadMoreError?: string | null;
  onRetryLoadMore?: () => Promise<void> | void;
}

function extractReactText(node: unknown, depth = 0): string {
  if (depth > 5 || node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node).trim();
  }
  if (Array.isArray(node)) {
    return node.map((child) => extractReactText(child, depth + 1)).filter(Boolean).join(' ').trim();
  }
  if (React.isValidElement(node)) {
    return extractReactText((node.props as any)?.children, depth + 1);
  }
  if (typeof node === 'object') {
    const obj = node as any;
    if (typeof obj.name === 'string') return obj.name;
    if (typeof obj.title === 'string') return obj.title;
    if (typeof obj.label === 'string') return obj.label;
    if (typeof obj.amount === 'number') return String(obj.amount);
  }
  return '';
}

function pickRecordTitle(item: any): string {
  if (!item || typeof item !== 'object') return '—';
  return (
    item.fullName ||
    item.name ||
    item.title ||
    item.reference ||
    item.ref ||
    item.code ||
    item.docNumber ||
    item.plateNumber ||
    item.clientName ||
    item.patientName ||
    item.studentName ||
    item.renterName ||
    item.companyName ||
    item.id ||
    '—'
  );
}

function pickRecordSubline(item: any): string {
  if (!item || typeof item !== 'object') return '';
  return (
    item.phoneNumber ||
    item.phone ||
    item.email ||
    item.sku ||
    item.code ||
    item.reference ||
    item.subtitle ||
    ''
  );
}

function resolveRawFieldValue(item: any, col: ColumnDefinition<any> | undefined): any {
  if (!item || !col) return '';
  const field = col.accessorKey || col.key || col.id || '';
  if (!field) return '';
  if (field.includes('.')) {
    return field.split('.').reduce((acc: any, part: string) => (acc ? acc[part] : undefined), item) ?? '';
  }
  return item[field] ?? '';
}

const noopSubscribe = () => () => {};
const getNullBridgeSnapshot = () => null;

export function UniversalDataCollection<T>({
  items,
  data,
  keyExtractor,
  defaultViewMode = 'list',
  columns,
  renderCalendarView,
  renderRow,
  onItemClick,
  onViewDetails,
  onEdit,
  onPay,
  onToggleStatus,
  onTogglePin,
  onDelete,
  customActions,
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
  hideToolbar = false,
  onToggleFilterModal,
  hasActiveAdvancedFilters = false,
  activeFiltersCount = 0,
  isFilterModalOpen = false,
  filterButtonRef,
  onExport,
  exportFilename,
  activeChips = [],
  openItemId = null,
  getRowMeta,
  getFanActions: getFanActionsOverride,
  getDetailActions: getDetailActionsOverride,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  primaryActionLabel,
  onAddFirstItem,
  onResetFilters,
  hasActiveFilters = false,
  isLoading,
  isOffline,
  isTimedOut,
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
  pageSize = 100,
  totalCount,
  hasMoreRemote = false,
  onLoadMore,
  isLoadingMore = false,
  loadMoreError = null,
  onRetryLoadMore,
}: UniversalDataCollectionProps<T>) {
  const [internalViewMode, setInternalViewMode] = useState<'list' | 'grid' | 'calendar'>(
    defaultViewMode
  );
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(() => new Set());
  const [internalPinnedIds, setInternalPinnedIds] = useState<Set<string>>(() => new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [internalSortBy, setInternalSortBy] = useState<string>(sortBy || '');
  const [internalSortDir, setInternalSortDir] = useState<'asc' | 'desc'>(
    sortDir || sortDirection || 'asc'
  );
  const [visibleLimit, setVisibleLimit] = useState<number>(pageSize);
  const lastSelectedIdxRef = useRef<number>(-1);

  const {
    branches,
    currentBranch,
    isSyncing: storeIsSyncing,
    networkMode: storeNetworkMode,
    isSyncTimeout: storeIsSyncTimeout,
    lastSyncedAt: storeLastSyncedAt,
    language: storeLanguage,
  } = useAtriumSelector(
    (s) => ({
      branches: s.branches,
      currentBranch: s.currentBranchId
        ? (s.branches || []).find((b) => b.id === s.currentBranchId) || null
        : null,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode,
      isSyncTimeout: s.isSyncTimeout,
      lastSyncedAt: s.lastSyncedAt,
      language: s.language,
    }),
    shallowEqualObjects
  );

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);
  const branchHeaderLabel =
    storeLanguage === 'ar' ? 'الفرع' : storeLanguage === 'fr' ? 'Branche' : 'Branch';

  const mappedCols = useMemo(
    () => mapLegacyColumnsToKineticSlots(columns, branchHeaderLabel),
    [columns, branchHeaderLabel]
  );

  const kineticHeaders: KineticColumnHeader[] = useMemo(
    () => [
      {
        key: mappedCols.identity.key || mappedCols.identity.id || mappedCols.identity.accessorKey || 'title',
        label: mappedCols.identity.header,
        sortable: mappedCols.identity.sortable !== false,
      },
      {
        key: mappedCols.category.key || mappedCols.category.id || mappedCols.category.accessorKey || 'category',
        label: mappedCols.category.header,
        sortable: mappedCols.category.sortable !== false,
      },
      {
        key: mappedCols.status.key || mappedCols.status.id || mappedCols.status.accessorKey || 'status',
        label: mappedCols.status.header,
        sortable: mappedCols.status.sortable !== false,
      },
      {
        key: mappedCols.metric.key || mappedCols.metric.id || mappedCols.metric.accessorKey || 'metric',
        label: mappedCols.metric.header,
        sortable: mappedCols.metric.sortable !== false,
      },
      {
        key: mappedCols.branch.key || mappedCols.branch.id || mappedCols.branch.accessorKey || 'branch',
        label: mappedCols.branch.header || branchHeaderLabel,
        sortable: true,
      },
    ],
    [mappedCols, branchHeaderLabel]
  );

  const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;
  const setViewMode = useCallback(
    (mode: 'list' | 'grid' | 'calendar') => {
      setInternalViewMode(mode);
      (onViewModeChange as any)?.(mode);
      if (mode === 'calendar' && onCalendarClick) {
        onCalendarClick();
      }
    },
    [onViewModeChange, onCalendarClick]
  );

  const effectiveSelectedIds =
    selectedIds !== undefined && onSelectionChange ? selectedIds : internalSelectedIds;

  const effectiveSortBy = sortBy !== undefined ? sortBy : internalSortBy;
  const effectiveSortDir =
    sortBy !== undefined ? sortDir || sortDirection || 'asc' : internalSortDir;

  const handleSort = useCallback(
    (fieldKey: string) => {
      const nextDir: 'asc' | 'desc' =
        effectiveSortBy === fieldKey && effectiveSortDir === 'asc' ? 'desc' : 'asc';
      if (onSortChange) {
        onSortChange(fieldKey, nextDir);
      } else {
        setInternalSortBy(fieldKey);
        setInternalSortDir(nextDir);
      }
    },
    [effectiveSortBy, effectiveSortDir, onSortChange]
  );

  const effectiveSearchQuery =
    searchQuery !== undefined ? searchQuery : internalSearchQuery;
  const sourceItems = items || data || [];

  const filteredItems = useMemo(() => {
    const q = effectiveSearchQuery.trim();
    if (!q) return sourceItems;
    const qLower = q.toLowerCase();
    return sourceItems.filter((item) => {
      const branchMatch = resolveRecordBranch(
        item,
        branchesById,
        currentBranch,
        storeLanguage
      )
        .name.toLowerCase()
        .includes(qLower);
      if (branchMatch) return true;
      if (searchFilter) return searchFilter(item, effectiveSearchQuery);
      const t = pickRecordTitle(item).toLowerCase();
      const s = pickRecordSubline(item).toLowerCase();
      return t.includes(qLower) || s.includes(qLower);
    });
  }, [
    sourceItems,
    searchFilter,
    effectiveSearchQuery,
    branchesById,
    currentBranch,
    storeLanguage,
  ]);

  const checkPinned = useCallback(
    (item: T): boolean => {
      const id = String(keyExtractor(item));
      if (pinnedIds) return pinnedIds.has(id);
      if (internalPinnedIds.has(id)) return true;
      return isPinned(item);
    },
    [keyExtractor, pinnedIds, internalPinnedIds, isPinned]
  );

  const sortedItems = useMemo(() => {
    let base = filteredItems;
    // Allow internal Branch sorting even when screen delegates other columns, OR full internal sort
    if (effectiveSortBy && (!onSortChange || effectiveSortBy === 'branch')) {
      const dirSign = effectiveSortDir === 'asc' ? 1 : -1;
      const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
      const colDef = columns.find(
        (c) =>
          (c.key || c.id || c.accessorKey) === effectiveSortBy ||
          c.accessorKey === effectiveSortBy
      );
      const field = colDef?.accessorKey || colDef?.key || colDef?.id || effectiveSortBy;

      base = [...filteredItems].sort((a: any, b: any) => {
        if (effectiveSortBy === 'branch') {
          const aBranch = resolveRecordBranch(a, branchesById, currentBranch, storeLanguage).name;
          const bBranch = resolveRecordBranch(b, branchesById, currentBranch, storeLanguage).name;
          return collator.compare(aBranch, bBranch) * dirSign;
        }
        const aVal = a?.[field] ?? '';
        const bVal = b?.[field] ?? '';
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * dirSign;
        }
        return collator.compare(String(aVal), String(bVal)) * dirSign;
      });
    }

    const pinnedList: T[] = [];
    const unpinnedList: T[] = [];
    for (let i = 0; i < base.length; i++) {
      const it = base[i];
      if (checkPinned(it)) pinnedList.push(it);
      else unpinnedList.push(it);
    }
    return pinnedList.length > 0 && unpinnedList.length > 0
      ? [...pinnedList, ...unpinnedList]
      : base;
  }, [
    filteredItems,
    onSortChange,
    effectiveSortBy,
    effectiveSortDir,
    columns,
    branchesById,
    currentBranch,
    storeLanguage,
    checkPinned,
  ]);

  const actualItems = sortedItems;
  const pagedItems = useMemo(
    () => (actualItems.length > visibleLimit ? actualItems.slice(0, visibleLimit) : actualItems),
    [actualItems, visibleLimit]
  );
  const hasMoreLocal = actualItems.length > visibleLimit;
  const canLoadMore = hasMoreLocal || hasMoreRemote;
  const displayTotalCount =
    typeof totalCount === 'number' && totalCount >= actualItems.length
      ? totalCount
      : actualItems.length;

  const handleLoadMore = useCallback(async () => {
    if (hasMoreLocal) {
      setVisibleLimit((prev) => prev + pageSize);
      return;
    }
    if (hasMoreRemote && onLoadMore) {
      await onLoadMore();
    }
  }, [hasMoreLocal, hasMoreRemote, onLoadMore, pageSize]);

  const itemsByIdMap = useMemo(() => {
    const map = new Map<string, T>();
    for (let i = 0; i < actualItems.length; i++) {
      const it = actualItems[i];
      map.set(String(keyExtractor(it)), it);
    }
    return map;
  }, [actualItems, keyExtractor]);

  const indexByIdMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < actualItems.length; i++) {
      map.set(String(keyExtractor(actualItems[i])), i);
    }
    return map;
  }, [actualItems, keyExtractor]);

  const resolvedPinnedIds = useMemo(() => {
    if (pinnedIds) return pinnedIds;
    const next = new Set<string>(internalPinnedIds);
    for (let i = 0; i < actualItems.length; i++) {
      const it = actualItems[i];
      if (isPinned(it)) next.add(String(keyExtractor(it)));
    }
    return next;
  }, [pinnedIds, internalPinnedIds, actualItems, isPinned, keyExtractor]);

  const handleTogglePin = useCallback(
    (item: T) => {
      const id = String(keyExtractor(item));
      if (onPinToggle) onPinToggle(id);
      else if (onTogglePin) onTogglePin(item);
      else {
        setInternalPinnedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }
    },
    [keyExtractor, onPinToggle, onTogglePin]
  );

  const handleToggleSelectAll = useCallback(() => {
    const allIds = actualItems.map((it) => String(keyExtractor(it)));
    const allSelected =
      allIds.length > 0 && allIds.every((id) => effectiveSelectedIds.has(id));
    const nextSet = allSelected ? new Set<string>() : new Set<string>(allIds);
    if (onSelectionChange) onSelectionChange(nextSet);
    setInternalSelectedIds(nextSet);
  }, [actualItems, keyExtractor, effectiveSelectedIds, onSelectionChange]);

  const handleSelectRow = useCallback(
    (id: string, e: React.MouseEvent) => {
      const idx = indexByIdMap.get(id) ?? -1;
      const next = new Set(effectiveSelectedIds);
      if (e.shiftKey && lastSelectedIdxRef.current > -1 && idx > -1) {
        const start = Math.min(lastSelectedIdxRef.current, idx);
        const end = Math.max(lastSelectedIdxRef.current, idx);
        for (let i = start; i <= end; i++) {
          next.add(String(keyExtractor(actualItems[i])));
        }
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (idx > -1) lastSelectedIdxRef.current = idx;
      if (onSelectionChange) onSelectionChange(next);
      setInternalSelectedIds(next);
    },
    [indexByIdMap, effectiveSelectedIds, actualItems, keyExtractor, onSelectionChange]
  );

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handlePruneSelection = useCallback(
    (hiddenIds: string[]) => {
      if (hiddenIds.length === 0) return;
      const hasAny = hiddenIds.some((id) => effectiveSelectedIds.has(id));
      if (!hasAny) return;
      const next = new Set(effectiveSelectedIds);
      hiddenIds.forEach((id) => next.delete(id));
      if (onSelectionChange) onSelectionChange(next);
      setInternalSelectedIds(next);
    },
    [effectiveSelectedIds, onSelectionChange]
  );

  const exportRecordsToCsv = useCallback(
    (records: readonly T[], suffix = 'export') => {
      const hasBranchCol = mappedCols.originalIndices.branch >= 0;
      const headers = [
        ...columns.map((c) => c.header),
        ...(hasBranchCol ? [] : [branchHeaderLabel]),
      ];
      const rows = records.map((item: any) => {
        const branch = resolveRecordBranch(
          item,
          branchesById,
          currentBranch,
          storeLanguage
        ).name;
        const baseCells = columns.map((c) => {
          const raw = resolveRawFieldValue(item, c);
          if (raw !== '' && raw !== undefined && raw !== null) {
            return typeof raw === 'object' ? extractReactText(raw) : String(raw);
          }
          const rendered = c.renderCell
            ? c.renderCell(item, false)
            : c.cell
            ? c.cell(item, false)
            : '';
          return extractReactText(rendered);
        });
        return hasBranchCol ? baseCells : [...baseCells, branch];
      });
      const dateStr = new Date().toISOString().split('T')[0];
      const baseName = exportFilename || `atrium-${suffix}-${dateStr}.csv`;
      downloadCsvSafe(baseName, headers, rows);
    },
    [columns, mappedCols.originalIndices.branch, branchHeaderLabel, branchesById, currentBranch, storeLanguage, exportFilename]
  );

  const handleToolbarExport = useCallback(async () => {
    if (onExport) {
      await onExport();
      return;
    }
    exportRecordsToCsv(actualItems, 'collection');
  }, [onExport, exportRecordsToCsv, actualItems]);

  const handleBulkExport = useCallback(() => {
    if (bulkSecondaryAction && !bulkCustomActions) {
      bulkSecondaryAction.onClick(effectiveSelectedIds);
      return;
    }
    const selectedRows = actualItems.filter((item) =>
      effectiveSelectedIds.has(String(keyExtractor(item)))
    );
    if (selectedRows.length === 0) return;
    exportRecordsToCsv(selectedRows, 'selection');
  }, [
    bulkSecondaryAction,
    bulkCustomActions,
    effectiveSelectedIds,
    actualItems,
    keyExtractor,
    exportRecordsToCsv,
  ]);

  const handleBulkDelete = useCallback(() => {
    if (onBulkDelete) {
      onBulkDelete(effectiveSelectedIds);
    } else if (onDelete) {
      actualItems.forEach((item) => {
        const id = String(keyExtractor(item));
        if (effectiveSelectedIds.has(id)) onDelete(item);
      });
    }
    if (onSelectionChange) onSelectionChange(new Set());
    setInternalSelectedIds(new Set());
  }, [onBulkDelete, onDelete, actualItems, keyExtractor, effectiveSelectedIds, onSelectionChange]);

  const handleClearSelection = useCallback(() => {
    if (onSelectionChange) onSelectionChange(new Set());
    setInternalSelectedIds(new Set());
  }, [onSelectionChange]);

  const bulkActionsList: KineticBulkAction[] = useMemo(() => {
    const list: KineticBulkAction[] = [];
    if (bulkSecondaryAction) {
      list.push({
        id: 'bulk-secondary',
        label: bulkSecondaryAction.label,
        icon: bulkSecondaryAction.icon,
        tone: bulkSecondaryAction.variant === 'primary' ? 'accent' : 'default',
        onClick: () => bulkSecondaryAction.onClick(effectiveSelectedIds),
      });
    }
    if (bulkCustomActions) {
      bulkCustomActions.forEach((act) => {
        list.push({
          id: act.id,
          label: act.label,
          icon: act.icon,
          onClick: () => act.onClick(effectiveSelectedIds),
        });
      });
    }
    return list;
  }, [bulkSecondaryAction, bulkCustomActions, effectiveSelectedIds]);

  const getCustomActions = useCallback(
    (item: T): ActionButtonDef[] | undefined => {
      if (!customActions) return undefined;
      return typeof customActions === 'function' ? customActions(item) : customActions;
    },
    [customActions]
  );

  const getRowData = useCallback(
    (item: T): KineticRowData => {
      const id = String(keyExtractor(item));
      const isSelected = effectiveSelectedIds.has(id);
      const pinned = checkPinned(item);
      const active = isActive(item);
      const branchInfo = resolveRecordBranch(
        item,
        branchesById,
        currentBranch,
        storeLanguage
      );

      const renderCol = (idx: number): React.ReactNode | undefined => {
        if (idx < 0 || !columns[idx]) return undefined;
        const c = columns[idx];
        return c.renderCell ? c.renderCell(item, isSelected) : c.cell ? c.cell(item, isSelected) : undefined;
      };

      const identityNode = renderCol(mappedCols.originalIndices.identity);
      const categoryNode = renderCol(mappedCols.originalIndices.category);
      const statusNode = renderCol(mappedCols.originalIndices.status);
      const metricNode = renderCol(mappedCols.originalIndices.metric);
      const branchNode =
        mappedCols.originalIndices.branch >= 0
          ? renderCol(mappedCols.originalIndices.branch)
          : undefined;

      const rawTitle = pickRecordTitle(item);
      const extractedTitle = extractReactText(identityNode) || rawTitle;
      const subline = pickRecordSubline(item);
      const categoryText =
        extractReactText(categoryNode) ||
        String(resolveRawFieldValue(item, columns[mappedCols.originalIndices.category]) || '—');
      const statusText =
        extractReactText(statusNode) ||
        String(
          resolveRawFieldValue(item, columns[mappedCols.originalIndices.status]) ||
            (active ? 'Actif' : 'Inactif')
        );
      const metricText =
        extractReactText(metricNode) ||
        String(resolveRawFieldValue(item, columns[mappedCols.originalIndices.metric]) || '—');

      const overflowFields = mappedCols.overflowIndices
        .map((idx) => {
          const c = columns[idx];
          if (!c) return null;
          const valNode = renderCol(idx);
          const rawVal = resolveRawFieldValue(item, c);
          return {
            label: c.header,
            value: valNode ?? (rawVal !== '' ? String(rawVal) : '—'),
          };
        })
        .filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

      const meta = getRowMeta ? getRowMeta(item) : undefined;
      const statusVariant: KineticStatusVariant =
        meta?.statusVariant || inferStatusVariant(statusText);

      return {
        id,
        title: meta?.title || extractedTitle || rawTitle,
        subline: meta?.subline ?? subline,
        avatarText: meta?.avatarText || extractInitials(extractedTitle || rawTitle),
        avatarColor: meta?.avatarColor || computeInitialsColor(extractedTitle || rawTitle),
        categoryLabel: meta?.categoryLabel || categoryText,
        statusLabel: meta?.statusLabel || statusText,
        statusVariant,
        metricPrimary: meta?.metricPrimary || metricText,
        metricSecondary: meta?.metricSecondary,
        branchName: meta?.branchName || branchInfo.name,
        branchCode: meta?.branchCode || branchInfo.code,
        isPinned: pinned,
        notes: meta?.notes ?? (item as any)?.notes,
        identityNode: meta?.identityNode ?? identityNode,
        categoryNode: meta?.categoryNode ?? categoryNode,
        statusNode: meta?.statusNode ?? statusNode,
        metricNode: meta?.metricNode ?? metricNode,
        branchNode: meta?.branchNode ?? branchNode,
        detailCol1: meta?.detailCol1 || {
          heading: mappedCols.identity.header,
          primaryText: extractedTitle || rawTitle,
          secondaryText: subline || branchInfo.name,
          tertiaryText: branchInfo.name,
        },
        detailCol2: meta?.detailCol2 || {
          heading: mappedCols.metric.header,
          primaryText: metricText || '—',
          secondaryText: categoryText || undefined,
          tertiaryText: statusText || undefined,
        },
        detailCol3: meta?.detailCol3,
        overflowFields: meta?.overflowFields ?? overflowFields,
      };
    },
    [
      keyExtractor,
      effectiveSelectedIds,
      checkPinned,
      isActive,
      branchesById,
      currentBranch,
      storeLanguage,
      columns,
      mappedCols,
      getRowMeta,
    ]
  );

  const getFanActions = useCallback(
    (item: T): KineticRowFanAction[] | undefined => {
      if (getFanActionsOverride) {
        const overridden = getFanActionsOverride(item);
        if (overridden) return overridden;
      }
      const id = String(keyExtractor(item));
      const titleLabel = pickRecordTitle(item);
      const custom = getCustomActions(item);
      const acts: KineticRowFanAction[] = [];

      if (onEdit) {
        acts.push({
          id: 'edit',
          label: `${storeLanguage === 'ar' ? 'تعديل' : storeLanguage === 'fr' ? 'Modifier' : 'Edit'} ${titleLabel}`,
          icon: <Pencil className="w-[15px] h-[15px]" />,
          onClick: (e) => onEdit(item, e.currentTarget),
        });
      } else if (onViewDetails) {
        acts.push({
          id: 'view',
          label: `${storeLanguage === 'ar' ? 'عرض' : storeLanguage === 'fr' ? 'Détails' : 'View'} ${titleLabel}`,
          icon: <Eye className="w-[15px] h-[15px]" />,
          onClick: (e) => onViewDetails(item, e.currentTarget),
        });
      }

      if (onPay) {
        acts.push({
          id: 'pay',
          label: storeLanguage === 'ar' ? 'دفع' : storeLanguage === 'fr' ? 'Encaisser' : 'Pay',
          icon: <CreditCard className="w-[15px] h-[15px]" />,
          onClick: () => onPay(item),
        });
      } else if (onToggleStatus) {
        acts.push({
          id: 'toggle',
          label:
            storeLanguage === 'ar' ? 'تبديل الحالة' : storeLanguage === 'fr' ? 'Changer statut' : 'Toggle status',
          icon: <Power className="w-[15px] h-[15px]" />,
          onClick: () => onToggleStatus(item),
        });
      } else if (custom && custom[0]) {
        const firstCustom = custom[0];
        acts.push({
          id: `custom_${id}`,
          label: firstCustom.label || firstCustom.tooltip || 'Action',
          icon: firstCustom.icon,
          onClick: () => firstCustom.onClick(),
        });
      }

      if (onDelete) {
        acts.push({
          id: 'del',
          label: `${storeLanguage === 'ar' ? 'حذف' : storeLanguage === 'fr' ? 'Supprimer' : 'Delete'} ${titleLabel}`,
          icon: <Trash2 className="w-[15px] h-[15px]" />,
          isDanger: true,
          onClick: () => onDelete(item),
        });
      }

      return acts.length > 0 ? acts : undefined;
    },
    [keyExtractor, getCustomActions, onEdit, onViewDetails, onPay, onToggleStatus, onDelete, storeLanguage]
  );

  const getDetailActions = useCallback(
    (item: T): KineticDetailAction[] => {
      if (getDetailActionsOverride) {
        const overridden = getDetailActionsOverride(item);
        if ((onTogglePin || onPinToggle) && !overridden.some((a) => a.id === 'pin')) {
          const pinned = checkPinned(item);
          return [
            ...overridden,
            {
              id: 'pin',
              label: pinned
                ? storeLanguage === 'ar' ? 'إلغاء التثبيت' : storeLanguage === 'fr' ? 'Détacher' : 'Unpin'
                : storeLanguage === 'ar' ? 'تثبيت' : storeLanguage === 'fr' ? 'Épingler' : 'Pin',
              icon: <Pin className="w-3.5 h-3.5" />,
              onClick: () => handleTogglePin(item),
            },
          ];
        }
        return overridden;
      }
      const actionsList: KineticDetailAction[] = [];
      if (onViewDetails || onItemClick) {
        actionsList.push({
          id: 'details',
          label:
            storeLanguage === 'ar' ? 'التفاصيل' : storeLanguage === 'fr' ? 'Fiche complète' : 'Details',
          icon: <Eye className="w-3.5 h-3.5" />,
          onClick: () => (onViewDetails || onItemClick)?.(item),
        });
      }
      if (onEdit) {
        actionsList.push({
          id: 'edit',
          label: storeLanguage === 'ar' ? 'تعديل' : storeLanguage === 'fr' ? 'Modifier' : 'Edit',
          icon: <Pencil className="w-3.5 h-3.5" />,
          onClick: () => onEdit(item),
        });
      }
      if (onPay) {
        actionsList.push({
          id: 'pay',
          label: storeLanguage === 'ar' ? 'دفع' : storeLanguage === 'fr' ? 'Encaisser' : 'Pay',
          icon: <CreditCard className="w-3.5 h-3.5" />,
          onClick: () => onPay(item),
        });
      }
      if (onToggleStatus) {
        actionsList.push({
          id: 'status',
          label: storeLanguage === 'ar' ? 'الحالة' : storeLanguage === 'fr' ? 'Statut' : 'Status',
          icon: <Power className="w-3.5 h-3.5" />,
          onClick: () => onToggleStatus(item),
        });
      }
      if (onTogglePin || onPinToggle) {
        const pinned = checkPinned(item);
        actionsList.push({
          id: 'pin',
          label: pinned
            ? storeLanguage === 'ar' ? 'إلغاء التثبيت' : storeLanguage === 'fr' ? 'Détacher' : 'Unpin'
            : storeLanguage === 'ar' ? 'تثبيت' : storeLanguage === 'fr' ? 'Épingler' : 'Pin',
          icon: <Pin className="w-3.5 h-3.5" />,
          onClick: () => handleTogglePin(item),
        });
      }
      const custom = getCustomActions(item);
      if (custom) {
        custom.forEach((act, idx) => {
          actionsList.push({
            id: `c_${idx}_${act.label || idx}`,
            label: act.label || act.tooltip || 'Action',
            icon: act.icon,
            onClick: act.onClick,
          });
        });
      }
      if (onDelete) {
        actionsList.push({
          id: 'delete',
          label: storeLanguage === 'ar' ? 'حذف' : storeLanguage === 'fr' ? 'Supprimer' : 'Delete',
          icon: <Trash2 className="w-3.5 h-3.5 text-[#c0283d]" />,
          onClick: () => onDelete(item),
        });
      }
      return actionsList;
    },
    [
      onViewDetails,
      onItemClick,
      onEdit,
      onPay,
      onToggleStatus,
      onTogglePin,
      onPinToggle,
      checkPinned,
      handleTogglePin,
      getCustomActions,
      onDelete,
      storeLanguage,
    ]
  );

  const handleOpenRowDetails = useCallback(
    (id: string, originEl?: HTMLElement | null) => {
      const item = itemsByIdMap.get(id);
      if (!item) return;
      if (onViewDetails) onViewDetails(item, originEl);
      else if (onItemClick) onItemClick(item, originEl);
      else if (onSelectRow) onSelectRow(item, originEl);
    },
    [itemsByIdMap, onViewDetails, onItemClick, onSelectRow]
  );

  const handleEditById = useCallback(
    (id: string, originEl?: HTMLElement | null) => {
      const item = itemsByIdMap.get(id);
      if (item && onEdit) onEdit(item, originEl);
    },
    [itemsByIdMap, onEdit]
  );

  const handleDeleteById = useCallback(
    (id: string) => {
      const item = itemsByIdMap.get(id);
      if (item && onDelete) onDelete(item);
    },
    [itemsByIdMap, onDelete]
  );

  const effectiveIsLoading =
    isLoading !== undefined
      ? isLoading
      : storeIsSyncing || storeNetworkMode === 'force_skeleton';
  const effectiveIsOffline =
    isOffline !== undefined ? isOffline : storeNetworkMode === 'offline';
  const effectiveIsTimedOut =
    isTimedOut !== undefined ? isTimedOut : storeIsSyncTimeout;
  const effectiveLastSyncedAt =
    lastSyncedAt !== undefined ? lastSyncedAt : storeLastSyncedAt;
  const effectiveOnRetrySync =
    onRetrySync !== undefined ? onRetrySync : retryCloudSyncAction;

  const shouldRenderSkeleton =
    (effectiveIsLoading &&
      !effectiveIsTimedOut &&
      !effectiveIsOffline &&
      actualItems.length === 0) ||
    storeNetworkMode === 'force_skeleton';

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
              <SkeletonBox width={72} height={32} sq="ctl" />
            )}
          </div>
        )}

        {viewMode === 'list' ? (
          <SkeletonTable
            columns={kineticHeaders.map((c) => ({
              width: '1.5*',
              minWidth: '100px',
              header: c.label,
            }))}
            rowCount={skeletonRowCount}
            showHeaderControls={!hideToolbar}
          />
        ) : (
          <SkeletonCardGrid count={skeletonRowCount} />
        )}
      </div>
    );
  }

  const shouldRenderToolbar =
    !hideToolbar &&
    (Boolean(title) ||
      Boolean(headerActions) ||
      (Boolean(filterOptions) && filterOptions!.length > 0 && Boolean(onFilterChange)) ||
      Boolean(searchFilter) ||
      Boolean(onSearchChange) ||
      showViewToggle);

  const filterKey = `${effectiveSearchQuery}|${filterValue || ''}|${effectiveSortBy}|${effectiveSortDir}|${actualItems.length}`;

  const toolbarSearchHandler = (val: string) => {
    setInternalSearchQuery(val);
    onSearchChange?.(val);
  };

  const podBridge = useContext(ScreenPodBridgeContext);
  const needsEmptyBridge = Boolean(hideToolbar && actualItems.length === 0 && podBridge);
  const bridgeSnapshot = useSyncExternalStore(
    needsEmptyBridge && podBridge ? podBridge.subscribe : noopSubscribe,
    needsEmptyBridge && podBridge ? podBridge.getSnapshot : getNullBridgeSnapshot,
    getNullBridgeSnapshot
  );

  const emptySearchQuery =
    searchQuery !== undefined
      ? searchQuery
      : bridgeSnapshot?.searchQuery ?? internalSearchQuery;
  const emptyTotalCount =
    totalCount !== undefined ? totalCount : bridgeSnapshot?.totalCount;
  const emptyFilterLabels =
    activeChips?.map((c) => c.label) ?? bridgeSnapshot?.activeFilterLabels;
  const emptyHasActiveFilters =
    hasActiveFilters ||
    Boolean(filterValue && filterValue !== 'All') ||
    Boolean(
      bridgeSnapshot?.statusValue &&
        !/^(all|tous|tout|everything|overview)$/i.test(bridgeSnapshot.statusValue)
    ) ||
    Boolean(bridgeSnapshot?.hasActiveAdvancedFilters) ||
    Boolean(emptyFilterLabels && emptyFilterLabels.length > 0);
  const emptyOnResetFilters =
    onResetFilters ??
    (bridgeSnapshot?.hasReset && podBridge ? podBridge.resetFilters : undefined);
  const emptyOnClearSearch =
    emptySearchQuery.trim().length > 0
      ? searchQuery === undefined && bridgeSnapshot?.hasSearchSetter && podBridge
        ? podBridge.clearSearch
        : () => toolbarSearchHandler('')
      : undefined;
  const emptySiteName = currentBranch?.name || undefined;
  const emptyLocale: 'fr' | 'en' | 'ar' =
    storeLanguage === 'ar' ? 'ar' : storeLanguage === 'en' ? 'en' : 'fr';

  return (
    <div className="w-full flex flex-col relative space-y-4">
      <OfflineRetryBanner
        isOffline={effectiveIsOffline}
        isTimedOut={effectiveIsTimedOut}
        lastSyncedAt={effectiveLastSyncedAt}
        onRetry={effectiveOnRetrySync}
      />

      {shouldRenderToolbar && (
        <ScreenCollectionToolbar
          title={title || ''}
          liveRegionText={`${actualItems.length} ${
            storeLanguage === 'ar' ? 'سجل' : storeLanguage === 'fr' ? 'éléments' : 'records'
          }`}
          language={storeLanguage}
          searchQuery={effectiveSearchQuery}
          onSearchChange={toolbarSearchHandler}
          searchPlaceholder={searchPlaceholder}
          statusOptions={
            filterOptions && filterOptions.length > 0 && onFilterChange
              ? filterOptions.map((o) => ({
                  value: o.value,
                  label: o.label,
                  tooltip: o.tooltip,
                  count:
                    (effectiveIsTimedOut || (effectiveIsOffline && actualItems.length === 0)) &&
                    o.count !== undefined
                      ? '–'
                      : o.count,
                }))
              : undefined
          }
          statusValue={filterValue}
          onStatusChange={onFilterChange}
          hasActiveAdvancedFilters={hasActiveAdvancedFilters}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={onToggleFilterModal}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showViewToggle={showViewToggle}
          showCalendarToggle={showCalendarToggle}
          onExport={handleToolbarExport}
          extraTrailingControls={headerActions}
          activeChips={activeChips}
          onResetAllFilters={onResetFilters}
        />
      )}

      {viewMode === 'calendar' && renderCalendarView ? (
        <div className="w-full">{renderCalendarView()}</div>
      ) : renderRow && viewMode === 'list' ? (
        actualItems.length === 0 ? (
          <div className="w-full min-h-[350px] flex flex-col">
            <CollectionEmptyState
              title={emptyTitle}
              description={emptyDescription}
              icon={emptyIcon}
              primaryActionLabel={primaryActionLabel}
              onPrimaryAction={onAddFirstItem}
              onResetFilters={emptyOnResetFilters}
              hasActiveFilters={emptyHasActiveFilters}
              searchQuery={emptySearchQuery}
              onClearSearch={emptyOnClearSearch}
              totalCount={emptyTotalCount}
              siteName={emptySiteName}
              activeFilterLabels={emptyFilterLabels}
              isError={effectiveIsTimedOut || (effectiveIsOffline && actualItems.length === 0)}
              lastSyncedAt={effectiveLastSyncedAt}
              onRetry={effectiveOnRetrySync}
              locale={emptyLocale}
            />
          </div>
        ) : (
          <div className="w-full flex flex-col gap-2">
            {pagedItems.map((item, idx) => {
              const id = String(keyExtractor(item) || `item_${idx}`);
              return (
                <React.Fragment key={id}>
                  {renderRow(item, effectiveSelectedIds.has(id), checkPinned(item))}
                </React.Fragment>
              );
            })}
          </div>
        )
      ) : (
        <KineticCollectionStage<T>
          items={pagedItems}
          keyExtractor={(it) => String(keyExtractor(it))}
          columns={kineticHeaders}
          getRowData={getRowData}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          filterKey={filterKey}
          expandedIds={expandedIds}
          selectedIds={effectiveSelectedIds}
          pinnedIds={resolvedPinnedIds}
          openItemId={openItemId}
          sortBy={effectiveSortBy}
          sortDir={effectiveSortDir}
          language={storeLanguage}
          ariaLabel={title || 'Collection'}
          emptyMessage={emptyDescription || emptyTitle}
          emptyState={
            actualItems.length === 0 ? (
              <CollectionEmptyState
                title={emptyTitle}
                description={emptyDescription}
                icon={emptyIcon}
                primaryActionLabel={primaryActionLabel}
                onPrimaryAction={onAddFirstItem}
                onResetFilters={emptyOnResetFilters}
                hasActiveFilters={emptyHasActiveFilters}
                searchQuery={emptySearchQuery}
                onClearSearch={emptyOnClearSearch}
                totalCount={emptyTotalCount}
                siteName={emptySiteName}
                activeFilterLabels={emptyFilterLabels}
                isError={effectiveIsTimedOut || (effectiveIsOffline && actualItems.length === 0)}
                lastSyncedAt={effectiveLastSyncedAt}
                onRetry={effectiveOnRetrySync}
                locale={emptyLocale}
              />
            ) : undefined
          }
          onPruneSelection={handlePruneSelection}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleSort={handleSort}
          onSelectRow={handleSelectRow}
          onToggleExpand={handleToggleExpand}
          onOpenDetails={handleOpenRowDetails}
          onEdit={onEdit ? handleEditById : undefined}
          onDelete={onDelete ? handleDeleteById : undefined}
          getFanActions={getFanActions}
          getDetailActions={getDetailActions}
        />
      )}

      {isLoadingMore && (
        <div className="w-full space-y-2 pt-1" aria-busy="true">
          <div data-sq="row" data-sq-border="solid" className="h-[54px] w-full bg-[var(--atr-soft)] border border-[var(--atr-line)] [--sq-stroke:var(--atr-line)] animate-pulse" />
          <div data-sq="row" data-sq-border="solid" className="h-[54px] w-full bg-[var(--atr-soft)] border border-[var(--atr-line)] [--sq-stroke:var(--atr-line)] animate-pulse" />
        </div>
      )}

      {loadMoreError && (
        <div
          data-sq="ctl"
          data-sq-border="solid"
          className="w-full px-4 py-2.5 border border-rose-300 dark:border-rose-800 [--sq-stroke:#fda4af] dark:[--sq-stroke:#9f1239] bg-rose-50 dark:bg-rose-950/30 flex items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-300"
        >
          <span>{loadMoreError}</span>
          {(onRetryLoadMore || onLoadMore) && (
            <button
              type="button"
              data-sq="ctl-sm"
              data-sq-border="solid"
              onClick={() => void (onRetryLoadMore || onLoadMore)?.()}
              className="px-3 py-1 border border-rose-300 dark:border-rose-700 [--sq-stroke:#fda4af] dark:[--sq-stroke:#be123c] font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {storeLanguage === 'ar' ? 'إعادة المحاولة' : storeLanguage === 'fr' ? 'Réessayer' : 'Retry'}
            </button>
          )}
        </div>
      )}

      {(canLoadMore || actualItems.length > pageSize || displayTotalCount > pagedItems.length) && (
        <div className="w-full pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--atr-line)] text-xs text-[var(--atr-ink-3)]">
          <span className="font-mono tabular-nums">
            {storeLanguage === 'ar'
              ? `عرض ${pagedItems.length} من أصل ${displayTotalCount} سجل`
              : storeLanguage === 'fr'
              ? `Affichage de ${pagedItems.length} sur ${displayTotalCount} enregistrements`
              : `Showing ${pagedItems.length} of ${displayTotalCount} records`}
          </span>

          {canLoadMore && (
            <button
              type="button"
              data-sq="ctl"
              data-sq-border="solid"
              disabled={isLoadingMore}
              onClick={() => void handleLoadMore()}
              className="h-9 px-4 bg-[var(--atr-card)] border border-[var(--atr-line)] [--sq-stroke:var(--atr-line)] hover:[--sq-stroke:var(--atr-acc)] text-xs font-semibold text-[var(--atr-ink)] transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {isLoadingMore
                ? storeLanguage === 'ar'
                  ? 'جاري التحميل...'
                  : storeLanguage === 'fr'
                  ? 'Chargement...'
                  : 'Loading...'
                : storeLanguage === 'ar'
                ? 'تحميل المزيد'
                : storeLanguage === 'fr'
                ? 'Charger plus'
                : 'Load More'}
            </button>
          )}
        </div>
      )}

      <KineticFloatingBulkBar
        selectedCount={effectiveSelectedIds.size}
        language={storeLanguage}
        actions={bulkActionsList}
        onExport={handleBulkExport}
        onDelete={onBulkDelete || onDelete ? handleBulkDelete : undefined}
        onClear={handleClearSelection}
      />
    </div>
  );
}
