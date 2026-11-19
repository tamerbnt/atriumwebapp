import React, { useState, useMemo, useRef, useCallback } from 'react';
import { History, ArrowDownUp, Printer, Eye } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { StockMovement } from '../../../types/index';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticFilterModal,
  KineticFilterSection,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorProgressBar,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const getInitials2 = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (name || 'MV').slice(0, 2).toUpperCase();
};

const MEMBER_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]';
const MEMBER_PILL_DANGER =
  'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]';

export const PosHistoryView: React.FC = () => {
  const { language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const {
    stockMovements,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'in' | 'out'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [selectedMovementIds, setSelectedMovementIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedMovementIds, setPinnedMovementIds] = useState<Set<string>>(() => new Set<string>());
  const [movementSortBy, setMovementSortBy] = useState<string>('date');
  const [movementSortDir, setMovementSortDir] = useState<'asc' | 'desc'>('desc');

  const [inspectingMovement, setInspectingMovement] = useState<StockMovement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('overview');
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);
  const allMovements = stockMovements || [];

  const movementStats = useMemo(() => {
    let unitsIn = 0;
    let unitsOut = 0;
    let adjustmentsCount = 0;
    const branchCounts = new Map<string, number>();

    allMovements.forEach((m) => {
      const bName = resolveRecordBranch(m, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
      if (m.quantity > 0) unitsIn += m.quantity;
      else unitsOut += Math.abs(m.quantity);
      if (m.type === 'Adjustment') adjustmentsCount++;
    });

    const netUnitsDelta = unitsIn - unitsOut;

    return {
      totalMovements: allMovements.length,
      unitsIn,
      unitsOut,
      netUnitsDelta,
      adjustmentsCount,
      branchOptionsWithCounts: Array.from(branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    };
  }, [allMovements, branchesById, currentBranch, language]);

  const filteredMovements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allMovements.filter((m) => {
      if (movementTypeFilter !== 'all' && m.type !== movementTypeFilter) return false;
      if (directionFilter === 'in' && m.quantity <= 0) return false;
      if (directionFilter === 'out' && m.quantity >= 0) return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(m, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const bName = resolveRecordBranch(m, branchesById, currentBranch, language).name.toLowerCase();
        return (
          m.productName.toLowerCase().includes(q) ||
          (m.reason && m.reason.toLowerCase().includes(q)) ||
          (m.createdBy && m.createdBy.toLowerCase().includes(q)) ||
          bName.includes(q)
        );
      }
      return true;
    });
  }, [allMovements, movementTypeFilter, directionFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedMovements = useMemo(() => {
    const sign = movementSortDir === 'asc' ? 1 : -1;
    return [...filteredMovements].sort((a, b) => {
      const aPinned = pinnedMovementIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedMovementIds.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      if (movementSortBy === 'date') {
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * sign;
      }
      if (movementSortBy === 'product') {
        return a.productName.localeCompare(b.productName) * sign;
      }
      if (movementSortBy === 'type') {
        return a.type.localeCompare(b.type) * sign;
      }
      if (movementSortBy === 'qty') {
        return (a.quantity - b.quantity) * sign;
      }
      if (movementSortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * sign;
      }
      return 0;
    });
  }, [filteredMovements, pinnedMovementIds, movementSortBy, movementSortDir, branchesById, currentBranch, language]);

  const handleResetFilters = useCallback(() => {
    setMovementTypeFilter('all');
    setDirectionFilter('all');
    setBranchFilter('All');
    setSearchQuery('');
    setIsFilterModalOpen(false);
  }, []);

  const hasActiveAdvancedFilters =
    branchFilter !== 'All' || (movementTypeFilter !== 'all' && !['Sale', 'Restock'].includes(movementTypeFilter));
  const activeFiltersCount =
    (branchFilter !== 'All' ? 1 : 0) +
    (movementTypeFilter !== 'all' ? 1 : 0);

  const handleExportMovementsCSV = useCallback(() => {
    const headers = [
      'Product',
      'Type',
      'Quantity Change',
      'Previous Stock',
      'New Stock',
      'Reason',
      'Operator',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
      'Timestamp',
    ];
    const rows = sortedMovements.map((m) => [
      m.productName,
      m.type,
      m.quantity,
      m.previousStock,
      m.newStock,
      m.reason || '',
      m.createdBy || 'Staff',
      resolveRecordBranch(m, branchesById, currentBranch, language).name,
      new Date(m.createdAt).toLocaleString(),
    ]);
    downloadCsvSafe(
      `atrium-stock-movements-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  }, [sortedMovements, branchesById, currentBranch, language, isAr, isEn]);

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: allMovements.length },
      { value: 'Sale', label: isAr ? 'مبيعات' : isEn ? 'Sales' : 'Ventes' },
      { value: 'Restock', label: isAr ? 'تموين' : isEn ? 'Restock' : 'Réassort' },
      { value: 'Adjustment', label: isAr ? 'تعديل' : isEn ? 'Adjust' : 'Ajustement' },
    ],
    [isAr, isEn, allMovements.length]
  );

  const filterSections = useMemo<KineticFilterSection[]>(
    () => [
      {
        id: 'branch',
        label: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'كل الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: allMovements.length },
          ...movementStats.branchOptionsWithCounts,
        ],
      },
      {
        id: 'type',
        label: isAr ? 'نوع الحركة' : isEn ? 'Movement Type' : 'Type de mouvement',
        value: movementTypeFilter,
        onChange: setMovementTypeFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
          { value: 'Sale', label: isAr ? 'بيع كاشير' : 'Vente POS' },
          { value: 'Restock', label: isAr ? 'تموين واستلام' : 'Réassort Stock' },
          { value: 'Return', label: isAr ? 'إرجاع زبون' : 'Retour Client' },
          { value: 'Damage', label: isAr ? 'تالف' : 'Perte / Casse' },
          { value: 'Adjustment', label: isAr ? 'تعديل جرد' : 'Ajustement' },
        ],
      },
      {
        id: 'direction',
        label: isAr ? 'اتجاه التدفق' : isEn ? 'Direction' : 'Sens du flux',
        value: directionFilter,
        onChange: (val) => setDirectionFilter(val as 'all' | 'in' | 'out'),
        kind: 'segmented',
        options: [
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
          { value: 'in', label: isAr ? 'دخول (+)' : 'Entrées (+)' },
          { value: 'out', label: isAr ? 'خروج (-)' : 'Sorties (-)' },
        ],
      },
    ],
    [isAr, isEn, branchFilter, allMovements.length, movementStats.branchOptionsWithCounts, movementTypeFilter, directionFilter]
  );

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') chips.push({ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') });
    if (movementTypeFilter !== 'all') chips.push({ key: 'type', label: movementTypeFilter, onRemove: () => setMovementTypeFilter('all') });
    if (directionFilter !== 'all') chips.push({ key: 'dir', label: directionFilter === 'in' ? 'Entrées (+)' : 'Sorties (-)', onRemove: () => setDirectionFilter('all') });
    return chips;
  }, [branchFilter, movementTypeFilter, directionFilter]);

  const movementColumns: ColumnDefinition<StockMovement>[] = useMemo(
    () => [
      {
        key: 'product',
        header: isAr ? 'المنتج / الصنف' : 'Article / Produit',
        width: '2.3*',
        minWidth: '170px',
        sortable: true,
        renderCell: (m) => (
          <div className="min-w-0">
            <div className="font-bold text-xs text-black dark:text-white truncate">
              {m.productName}
            </div>
            <div className="text-[10px] text-black/55 dark:text-white/55 truncate">
              {m.reason || 'Mouvement régulier'}
            </div>
          </div>
        ),
      },
      {
        key: 'type',
        header: isAr ? 'نوع الحركة' : 'Type Mouvement',
        width: '1.2*',
        minWidth: '110px',
        sortable: true,
        renderCell: (m) => {
          const isRestock = m.type === 'Restock' || m.type === 'Initial';
          const isSale = m.type === 'Sale';
          const isReturn = m.type === 'Return';
          const isDamage = m.type === 'Damage';
          return (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isRestock
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : isSale
                  ? 'text-black/70 dark:text-white/75'
                  : isReturn
                  ? 'text-blue-600 dark:text-blue-400'
                  : isDamage
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {m.type === 'Sale'
                ? isAr ? 'بيع كاشير' : 'Vente POS'
                : isRestock
                ? isAr ? 'تموين' : 'Réassort'
                : m.type === 'Return'
                ? isAr ? 'إرجاع' : 'Retour Client'
                : m.type === 'Damage'
                ? isAr ? 'تالف' : 'Casse'
                : m.type}
            </span>
          );
        },
      },
      {
        key: 'qty',
        header: isAr ? 'الكمية' : 'Quantité',
        width: '1*',
        minWidth: '90px',
        sortable: true,
        renderCell: (m) => (
          <span
            className={`font-mono font-black text-xs tabular-nums ${
              m.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
          </span>
        ),
      },
      {
        key: 'transition',
        header: isAr ? 'الرصيد (قبل ← بعد)' : 'Évolution',
        width: '1.5*',
        minWidth: '120px',
        renderCell: (m) => (
          <span className="font-mono text-xs text-black/55 dark:text-white/55 tabular-nums">
            {m.previousStock} → <span className="font-bold text-black dark:text-white">{m.newStock}</span>
          </span>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '1.2*',
        minWidth: '110px',
        sortable: true,
        renderCell: (m) => (
          <span className="text-xs font-medium text-black/75 dark:text-white/80 truncate block">
            {resolveRecordBranch(m, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'date',
        header: isAr ? 'التاريخ' : 'Horodatage',
        width: '1.4*',
        minWidth: '130px',
        sortable: true,
        renderCell: (m) => (
          <span className="text-xs text-black/55 dark:text-white/55 font-mono">
            {new Date(m.createdAt).toLocaleString()}
          </span>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
  );

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: allMovements.length > 0,
  });

  if (showSkeleton && (allMovements.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.2*', minWidth: '110px' },
          { width: '1.2*', minWidth: '110px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '1.5*', minWidth: '140px' },
        ]}
        viewMode={viewMode}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenHeaderBar
        icon={<History size={22} />}
        title={isAr ? 'السجل' : isEn ? 'History' : 'Historique'}
        primaryAction={{
          label: isAr ? 'طباعة السجل' : isEn ? 'Print Audit' : 'Imprimer Journal',
          icon: <Printer size={15} />,
          onClick: () => window.print(),
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات حركة وتدفق المخزون' : isEn ? 'Inventory Flow & Audit' : 'Indicateurs de Flux & Conformité d’Inventaire'}
        language={language}
        primaryCard={{
          label: isAr ? 'الوحدات المضافة (+)' : isEn ? 'Stock In (+)' : 'Entrées Physiques (+)',
          badgeText: 'Réassorts & Retours',
          count: movementStats.unitsIn,
          tone: 'emerald',
          isActive: directionFilter === 'in',
          onToggle: () => setDirectionFilter((p) => (p === 'in' ? 'all' : 'in')),
        }}
        secondaryCard={{
          label: isAr ? 'الوحدات المخصومة (-)' : isEn ? 'Stock Out (-)' : 'Sorties Physiques (-)',
          badgeText: 'ventes & pertes',
          count: movementStats.unitsOut,
          tone: 'terracotta',
          isActive: directionFilter === 'out',
          onToggle: () => setDirectionFilter((p) => (p === 'out' ? 'all' : 'out')),
        }}
        darkCard={{
          label: isAr ? 'تدقيق الحركات والرصيد الصافي' : isEn ? 'Net Movement Delta' : 'Journal & Solde Net',
          badgePrefix: '',
          badgeCount: movementStats.totalMovements,
          badgeSuffix: isAr ? 'حركة' : 'mouvements',
          valuePrefix: movementStats.netUnitsDelta >= 0 ? '+' : '',
          valueCount: movementStats.netUnitsDelta,
          valueSuffix: ' u.',
          caption: `${movementStats.adjustmentsCount} rectifications · ${currentBranch?.name || 'Magasin'}`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'سجل حركات المخزون والمراجعة' : isEn ? 'Stock Audit Log' : 'Registre des Mouvements de Stock'}
          liveRegionText={`${sortedMovements.length} mouvements`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث في الحركات والفرع...' : 'Rechercher produit, motif, branche...'}
          statusOptions={statusOptions}
          statusValue={movementTypeFilter}
          onStatusChange={setMovementTypeFilter}
          hasActiveAdvancedFilters={hasActiveAdvancedFilters}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          onExport={handleExportMovementsCSV}
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <UniversalDataCollection<StockMovement>
          items={sortedMovements}
          keyExtractor={(m) => m.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode="list"
          pageSize={50}
          hideToolbar
          openItemId={inspectingMovement?.id ?? null}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          columns={movementColumns}
          sortBy={movementSortBy}
          sortDirection={movementSortDir}
          onSortChange={(col, dir) => {
            setMovementSortBy(col);
            setMovementSortDir(dir);
          }}
          onItemClick={(m, opener) => {
            setDrawerOpenerEl(opener || null);
            setInspectorTab('overview');
            setInspectingMovement(m);
          }}
          onViewDetails={(m, opener) => {
            setDrawerOpenerEl(opener || null);
            setInspectorTab('overview');
            setInspectingMovement(m);
          }}
          getRowMeta={(m): Partial<KineticRowData> => {
            const branchInfo = resolveRecordBranch(m, branchesById, currentBranch, language);
            const isPositive = m.quantity > 0;
            return {
              title: m.productName,
              subline: `${m.reason || 'Mouvement régulier'} · ${new Date(m.createdAt).toLocaleString()}`,
              avatarText: getInitials2(m.productName),
              categoryLabel: m.type,
              statusLabel: isPositive ? `+${m.quantity}` : `${m.quantity}`,
              statusVariant: isPositive ? 'active' : 'blocked',
              metricPrimary: `${m.previousStock} → ${m.newStock}`,
              metricSecondary: m.createdBy || 'Staff',
              branchName: branchInfo.name,
              branchCode: branchInfo.code,
              isPinned: pinnedMovementIds.has(m.id),
              detailCol1: {
                heading: isAr ? 'المنتج' : 'Article',
                primaryText: m.productName,
                secondaryText: m.type,
                tertiaryText: m.createdBy || 'Staff',
              },
              detailCol2: {
                heading: isAr ? 'تطور الرصيد' : 'Transition Stock',
                primaryText: `${m.previousStock} → ${m.newStock}`,
                secondaryText: `Delta: ${isPositive ? '+' : ''}${m.quantity}`,
              },
              detailCol3: {
                heading: isAr ? 'السبب والتوقيت' : 'Traçabilité',
                primaryText: m.reason || 'Mouvement régulier',
                secondaryText: new Date(m.createdAt).toLocaleString(),
              },
            };
          }}
          getFanActions={(m): KineticRowFanAction[] => [
            {
              id: 'inspect',
              label: isAr ? 'معاينة' : 'Détails',
              icon: <Eye className="w-[15px] h-[15px]" />,
              onClick: (e) => {
                setDrawerOpenerEl(e.currentTarget);
                setInspectorTab('overview');
                setInspectingMovement(m);
              },
            },
            {
              id: 'print',
              label: isAr ? 'طباعة' : 'Imprimer',
              icon: <Printer className="w-[15px] h-[15px]" />,
              onClick: () => window.print(),
            },
          ]}
          getDetailActions={(m): KineticDetailAction[] => [
            {
              id: 'inspect',
              label: isAr ? 'تفاصيل الحركة' : 'Ouvrir fiche',
              icon: <Eye className="w-3.5 h-3.5" />,
              onClick: () => {
                setInspectorTab('overview');
                setInspectingMovement(m);
              },
            },
            {
              id: 'print',
              label: isAr ? 'طباعة' : 'Imprimer',
              icon: <Printer className="w-3.5 h-3.5" />,
              onClick: () => window.print(),
            },
          ]}
          selectedIds={selectedMovementIds}
          onSelectionChange={setSelectedMovementIds}
          pinnedIds={pinnedMovementIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedMovementIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          emptyTitle={isAr ? 'لا توجد حركات مطابقة' : 'Aucun mouvement trouvé'}
          emptyDescription={isAr ? 'قم بتسجيل مبيعات أو تعديل المخزون' : 'Les transactions et réassorts apparaîtront ici.'}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveAdvancedFilters || directionFilter !== 'all' || movementTypeFilter !== 'all' || searchQuery.trim().length > 0}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedMovements.length}
        entityPluralLabel={isAr ? 'حركات' : 'mouvements'}
        hasActiveFilters={hasActiveAdvancedFilters || directionFilter !== 'all'}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<StockMovement>
        isOpen={inspectingMovement !== null}
        item={inspectingMovement}
        allItems={sortedMovements}
        keyExtractor={(m) => m.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectingMovement?.productName || ''}
        subtitle={inspectingMovement ? `${inspectingMovement.type} · ${new Date(inspectingMovement.createdAt).toLocaleString()}` : undefined}
        avatarText={inspectingMovement ? getInitials2(inspectingMovement.productName) : 'MV'}
        avatarColor="#d4522f"
        branchName={inspectingMovement ? resolveRecordBranch(inspectingMovement, branchesById, currentBranch, language).name : undefined}
        statusLabel={inspectingMovement ? (inspectingMovement.quantity >= 0 ? `+${inspectingMovement.quantity}` : `${inspectingMovement.quantity}`) : undefined}
        statusClassName={inspectingMovement && inspectingMovement.quantity >= 0 ? MEMBER_PILL_OK : MEMBER_PILL_DANGER}
        tabs={[
          { id: 'overview', label: isAr ? 'الملخص' : isEn ? 'Overview' : 'Mouvement' },
          { id: 'trace', label: isAr ? 'الأثر والتدقيق' : isEn ? 'Audit Trail' : 'Traçabilité' },
          { id: 'actions', label: isAr ? 'إجراءات' : isEn ? 'Actions' : 'Actions' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onClose={() => setInspectingMovement(null)}
        onSelectItem={(m) => {
          setInspectorTab('overview');
          setInspectingMovement(m);
        }}
        renderBody={(m, tab, epoch) => {
          const isPositive = m.quantity >= 0;
          const maxStock = Math.max(m.previousStock, m.newStock, 10);
          const pct = Math.min(100, Math.round((m.newStock / maxStock) * 100));

          if (tab === 'trace') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title={isAr ? 'أثر التدقيق' : 'Piste d’Audit'}>
                  <InspectorCard>
                    <InspectorKeyValue label={isAr ? 'الرصيد قبل' : 'Solde Avant'} value={m.previousStock} />
                    <InspectorKeyValue label={isAr ? 'الرصيد بعد' : 'Solde Après'} value={m.newStock} tone={isPositive ? 'ok' : 'danger'} />
                    <InspectorProgressBar percent={pct} tone={isPositive ? 'ok' : 'warn'} animateKey={`${m.id}-${epoch}-trace`} />
                    <InspectorKeyValue label={isAr ? 'المشغل' : 'Opérateur'} value={m.createdBy || 'Staff'} mono={false} />
                    <InspectorKeyValue label={isAr ? 'التاريخ' : 'Horodatage'} value={new Date(m.createdAt).toLocaleString()} isLast />
                  </InspectorCard>
                </InspectorSection>
              </div>
            );
          }

          if (tab === 'actions') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0}>
                  <InspectorQuickActions
                    actions={[
                      {
                        id: 'print',
                        label: isAr ? 'طباعة السجل' : 'Imprimer Journal',
                        icon: <Printer size={16} />,
                        primary: true,
                        onClick: () => window.print(),
                      },
                      {
                        id: 'csv',
                        label: isAr ? 'تصدير CSV' : 'Exporter CSV',
                        icon: <ArrowDownUp size={16} />,
                        onClick: handleExportMovementsCSV,
                      },
                    ]}
                  />
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={isAr ? 'طباعة بطاقة الحركة' : 'Imprimer Fiche Mouvement'}
                    icon={<Printer size={15} />}
                    onClick={() => window.print()}
                  />
                </InspectorSection>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <InspectorSection index={0}>
                <InspectorBigStat
                  value={isPositive ? `+${m.quantity}` : `${m.quantity}`}
                  tone={isPositive ? 'ok' : 'danger'}
                  caption={`${m.previousStock} → ${m.newStock} unités`}
                />
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'تفاصيل العملية' : 'Détails Mouvement'}>
                <InspectorCard>
                  <InspectorKeyValue label={isAr ? 'النوع' : 'Type'} value={m.type} mono={false} />
                  <InspectorKeyValue label={isAr ? 'قبل' : 'Stock Avant'} value={m.previousStock} />
                  <InspectorKeyValue label={isAr ? 'بعد' : 'Stock Après'} value={m.newStock} tone="accent" />
                  <InspectorKeyValue label={isAr ? 'المسؤول' : 'Opérateur'} value={m.createdBy || 'Staff'} mono={false} />
                  <InspectorKeyValue label={isAr ? 'السبب' : 'Motif'} value={m.reason || 'Mouvement standard POS'} mono={false} isLast />
                </InspectorCard>
              </InspectorSection>
            </div>
          );
        }}
      />
    </div>
  );
};
