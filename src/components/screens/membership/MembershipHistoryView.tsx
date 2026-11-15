import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  History,
  Receipt,
  CreditCard,
  Banknote,
  User,
  X,
  Check,
  Printer,
  Scissors,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentSalesFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { Sale } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { AtriumButton } from '../../ui/AtriumButton';
import { LabelSelect } from '../../ui/LabelSelect';
import { t } from '../../../utils/i18n';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticFilterModal,
  KineticFilterSection,
  KineticSlideOverInspector,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

export const MembershipHistoryView: React.FC = React.memo(() => {
  const {
    sales,
    branches,
    currentBranch,
    language,
    isSyncing,
    networkMode,
    isSyncTimeout,
    lastSyncedAt,
  } = useAtriumSelector(
    (s) => ({
      sales: selectCurrentSalesFromState(s),
      branches: s.branches,
      currentBranch: selectCurrentBranchFromState(s),
      language: s.language,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      isSyncTimeout: s.isSyncTimeout || false,
      lastSyncedAt: s.lastSyncedAt,
    }),
    shallowEqualObjects
  );

  const { setScreen, refundSale, retryCloudSync } = useAtriumActions();

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('Customer return / exchange');
  const [refundSuccessToast, setRefundSuccessToast] = useState<string | null>(null);
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(() => new Set());
  const [pinnedSaleIds, setPinnedSaleIds] = useState<Set<string>>(() => new Set());
  const [saleSortBy, setSaleSortBy] = useState('date');
  const [saleSortDir, setSaleSortDir] = useState<'asc' | 'desc'>('desc');

  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchOptionsWithCounts = useMemo(() => {
    const map = new Map<string, number>();
    sales.forEach((s) => {
      const bName = resolveRecordBranch(s, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ value: name, label: name, count }));
  }, [sales, branchesById, currentBranch, language]);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (statusFilter === 'Settled' && s.status === 'Refunded') return false;
      if (statusFilter === 'Refunded' && s.status !== 'Refunded') return false;
      if (methodFilter !== 'All' && s.paymentMethod !== methodFilter) return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(s, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const bName = resolveRecordBranch(s, branchesById, currentBranch, language).name.toLowerCase();
        const matchId = s.id.toLowerCase().includes(q);
        const matchName = s.memberName?.toLowerCase().includes(q);
        const matchMethod = s.paymentMethod.toLowerCase().includes(q);
        const matchItem = s.items.some((i) => i.productName.toLowerCase().includes(q));
        if (!matchId && !matchName && !matchMethod && !matchItem && !bName.includes(q)) return false;
      }
      return true;
    });
  }, [sales, statusFilter, methodFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const statusCounts = useMemo(() => ({
    all: sales.length,
    settled: sales.filter((s) => s.status !== 'Refunded').length,
    refunded: sales.filter((s) => s.status === 'Refunded').length,
  }), [sales]);

  const totalSettledAmount = useMemo(
    () => sales.reduce((sum, s) => sum + s.totalAmount, 0),
    [sales]
  );
  const cashShare = useMemo(() => {
    const cashTotal = sales
      .filter((s) => s.paymentMethod === 'Cash')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    return totalSettledAmount > 0 ? Math.round((cashTotal / totalSettledAmount) * 100) : 0;
  }, [sales, totalSettledAmount]);

  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      const aPinned = pinnedSaleIds.has(a.id);
      const bPinned = pinnedSaleIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (saleSortBy === 'date') {
        const cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return saleSortDir === 'asc' ? cmp : -cmp;
      }
      if (saleSortBy === 'customer') {
        const cmp = (a.memberName || '').localeCompare(b.memberName || '');
        return saleSortDir === 'asc' ? cmp : -cmp;
      }
      if (saleSortBy === 'total') {
        const cmp = a.totalAmount - b.totalAmount;
        return saleSortDir === 'asc' ? cmp : -cmp;
      }
      if (saleSortBy === 'method') {
        const cmp = a.paymentMethod.localeCompare(b.paymentMethod);
        return saleSortDir === 'asc' ? cmp : -cmp;
      }
      if (saleSortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        const cmp = ba.localeCompare(bb);
        return saleSortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredSales, pinnedSaleIds, saleSortBy, saleSortDir, branchesById, currentBranch, language]);

  const getLocalizedPaymentMethod = useCallback(
    (method: string) => {
      if (method === 'Cash') return language === 'ar' ? 'نقداً' : language === 'fr' ? 'Espèces' : 'Cash';
      if (method === 'Card') return language === 'ar' ? 'بطاقة بنكية' : language === 'fr' ? 'Carte bancaire' : 'Card';
      if (method === 'Split') return language === 'ar' ? 'مقسم' : language === 'fr' ? 'Mixte' : 'Split';
      if (method === 'MemberBalance')
        return language === 'ar' ? 'رصيد المشترك' : language === 'fr' ? 'Solde adhérent' : 'Member Balance';
      return method;
    },
    [language]
  );

  const handleExportCSV = useCallback(() => {
    const headers = [
      'Receipt ID',
      'Date',
      'Time',
      'Customer',
      'Items Count',
      'Payment Method',
      language === 'ar' ? 'الفرع' : language === 'fr' ? 'Branche' : 'Branch',
      'Total (DA)',
    ];
    const rows = sortedSales.map((s) => [
      s.id,
      new Date(s.createdAt).toLocaleDateString(),
      new Date(s.createdAt).toLocaleTimeString(),
      s.memberName || 'Guest Walk-In',
      s.items.length,
      s.paymentMethod,
      resolveRecordBranch(s, branchesById, currentBranch, language).name,
      s.totalAmount,
    ]);
    downloadCsvSafe(
      `atrium-sales-audit-${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
  }, [sortedSales, branchesById, currentBranch, language]);

  const handleResetFilters = useCallback(() => {
    setStatusFilter('All');
    setMethodFilter('All');
    setBranchFilter('All');
    setSearchQuery('');
    setIsFilterModalOpen(false);
  }, []);

  const hasActiveAdvancedFilters = methodFilter !== 'All' || branchFilter !== 'All';
  const activeFiltersCount = (methodFilter !== 'All' ? 1 : 0) + (branchFilter !== 'All' ? 1 : 0);

  const saleColumns = useMemo<ColumnDefinition<Sale>[]>(() => [
    {
      key: 'customer',
      header: language === 'ar' ? 'العميل / الوصل' : language === 'fr' ? 'Client & Ticket' : 'Customer & Receipt',
      sortable: true,
      renderCell: (sale) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#F3EDE7] dark:bg-[#262422] flex items-center justify-center text-xs font-bold text-black/75 dark:text-white/80 shrink-0">
            {(sale.memberName || 'G').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="text-[13.5px] font-semibold text-black dark:text-white truncate block">
              {sale.memberName ||
                (language === 'ar' ? 'زائر غير مسجل' : language === 'fr' ? 'Client de passage' : 'Guest Walk-In')}
            </span>
            <span className="text-[11px] font-mono text-[#d4522f] font-semibold block">
              #{sale.id}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'method',
      header: language === 'ar' ? 'طريقة الدفع' : language === 'fr' ? 'Règlement' : 'Tender',
      sortable: true,
      renderCell: (sale) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11.5px] font-semibold bg-[#F3EDE7] dark:bg-[#262422] text-black/75 dark:text-white/80">
          {sale.paymentMethod === 'Cash' && <Banknote size={12} className="text-emerald-600" />}
          {sale.paymentMethod === 'Card' && <CreditCard size={12} className="text-blue-600" />}
          {sale.paymentMethod === 'Split' && <CreditCard size={12} className="text-purple-600" />}
          {sale.paymentMethod === 'MemberBalance' && <User size={12} className="text-[#d4522f]" />}
          <span>{getLocalizedPaymentMethod(sale.paymentMethod)}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status',
      sortable: true,
      renderCell: (sale) => {
        const isRefunded = sale.status === 'Refunded';
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold ${
              isRefunded
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isRefunded ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            {isRefunded
              ? language === 'ar' ? 'مسترجع' : language === 'fr' ? 'Remboursé' : 'Refunded'
              : language === 'ar' ? 'مسدد' : language === 'fr' ? 'Encaissé' : 'Settled'}
          </span>
        );
      },
    },
    {
      key: 'total',
      header: language === 'ar' ? 'المبلغ والتاريخ' : language === 'fr' ? 'Montant & Date' : 'Amount & Date',
      sortable: true,
      renderCell: (sale) => (
        <div className="tabular-nums">
          <span
            className={`text-[13px] font-bold font-mono block ${
              sale.status === 'Refunded' ? 'line-through text-black/55 dark:text-white/55' : 'text-black dark:text-white'
            }`}
          >
            {formatMoney(sale.totalAmount)}
          </span>
          <span className="text-[11px] text-black/62 dark:text-white/65 block">
            {new Date(sale.createdAt).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      key: 'branch',
      header: language === 'ar' ? 'الفرع' : language === 'fr' ? 'Branche' : 'Branch',
      sortable: true,
      renderCell: (sale) => (
        <span className="text-[12.5px] font-medium text-black/80 dark:text-white/85 truncate block">
          {resolveRecordBranch(sale, branchesById, currentBranch, language).name}
        </span>
      ),
    },
  ], [language, getLocalizedPaymentMethod, branchesById, currentBranch]);

  const statusOptions = useMemo(() => [
    { value: 'All', label: language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All', count: statusCounts.all },
    { value: 'Settled', label: language === 'ar' ? 'مسدد' : language === 'fr' ? 'Encaissé' : 'Settled', count: statusCounts.settled },
    { value: 'Refunded', label: language === 'ar' ? 'مسترجع' : language === 'fr' ? 'Remboursé' : 'Refunded', count: statusCounts.refunded },
  ], [language, statusCounts]);

  const filterSections = useMemo<KineticFilterSection[]>(() => [
    {
      id: 'branch',
      label: language === 'ar' ? 'الفرع' : language === 'fr' ? 'Branche' : 'Branch',
      value: branchFilter,
      onChange: setBranchFilter,
      kind: 'tiles',
      columns: 2,
      options: [
        {
          value: 'All',
          label: language === 'ar' ? 'كل الفروع' : language === 'fr' ? 'Toutes les branches' : 'All Branches',
          count: sales.length,
        },
        ...branchOptionsWithCounts,
      ],
    },
    {
      id: 'method',
      label: language === 'ar' ? 'طريقة الدفع' : language === 'fr' ? 'Mode de règlement' : 'Tender Method',
      value: methodFilter,
      onChange: setMethodFilter,
      kind: 'segmented',
      options: [
        { value: 'All', label: language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All' },
        { value: 'Cash', label: language === 'ar' ? 'نقداً' : language === 'fr' ? 'Espèces' : 'Cash' },
        { value: 'Card', label: language === 'ar' ? 'بطاقة' : language === 'fr' ? 'Carte' : 'Card' },
        { value: 'Split', label: language === 'ar' ? 'مقسم' : language === 'fr' ? 'Mixte' : 'Split' },
        { value: 'MemberBalance', label: language === 'ar' ? 'الرصيد' : language === 'fr' ? 'Solde' : 'Balance' },
      ],
    },
  ], [language, branchFilter, sales.length, branchOptionsWithCounts, methodFilter]);

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') chips.push({ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') });
    if (methodFilter !== 'All') {
      chips.push({
        key: 'method',
        label: getLocalizedPaymentMethod(methodFilter),
        onRemove: () => setMethodFilter('All'),
      });
    }
    return chips;
  }, [branchFilter, methodFilter, getLocalizedPaymentMethod]);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: sales.length > 0,
  });

  if (showSkeleton && (sales.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.4*', minWidth: '110px' },
          { width: '1.4*', minWidth: '110px' },
          { width: '1.2*', minWidth: '100px' },
        ]}
        viewMode={viewMode}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      {refundSuccessToast && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 rounded-2xl text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-rose-600" />
            <span>{refundSuccessToast}</span>
          </div>
          <button type="button" onClick={() => setRefundSuccessToast(null)} className="text-rose-600 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      <ScreenHeaderBar
        icon={<History size={22} />}
        title={t('history_sales_ledger', language)}
        primaryAction={{
          label: t('shop_title', language),
          onClick: () => setScreen('shop'),
          icon: <Receipt size={16} strokeWidth={2.2} />,
          dataAction: 'open-shop',
        }}
      />

      <ScreenKpiBanner
        heading={
          language === 'ar'
            ? 'التسويات المالية ومؤشرات التدقيق'
            : language === 'fr'
            ? "Règlements financiers & Piste d'audit"
            : 'Payments & Audit'
        }
        language={language}
        primaryCard={{
          label:
            language === 'ar'
              ? 'إجمالي الحجم المحصل'
              : language === 'fr'
              ? 'Volume total rapproché'
              : 'Total Reconciled Volume',
          badgeText: `↗ 100% ${language === 'ar' ? 'مدقق' : language === 'fr' ? 'Audité' : 'Audited'}`,
          count: totalSettledAmount,
          formatValue: (n) => formatMoney(n),
          tone: 'emerald',
          isActive: statusFilter === 'Settled',
          onToggle: () => setStatusFilter((p) => (p === 'Settled' ? 'All' : 'Settled')),
        }}
        secondaryCard={{
          label:
            language === 'ar'
              ? 'نسبة الدفع النقدي'
              : language === 'fr'
              ? 'Part des espèces'
              : 'Cash Tender Ratio',
          badgeText: `% ${language === 'ar' ? 'نقداً' : language === 'fr' ? 'Espèces' : 'Cash'}`,
          count: cashShare,
          tone: 'terracotta',
          isActive: statusFilter === 'Refunded',
          onToggle: () => setStatusFilter((p) => (p === 'Refunded' ? 'All' : 'Refunded')),
        }}
        darkCard={{
          label:
            language === 'ar'
              ? 'الوصولات الصادرة'
              : language === 'fr'
              ? 'Reçus émis (POS-01)'
              : 'Receipts Issued',
          badgePrefix: '',
          badgeCount: statusCounts.refunded,
          badgeSuffix: language === 'ar' ? 'مسترجع' : language === 'fr' ? 'remboursés' : 'refunded',
          valuePrefix: '',
          valueCount: sales.length,
          caption: `${currentBranch?.name || 'Atrium'} · POS-01 Online`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            language === 'ar'
              ? 'سجل العمليات والوصولات'
              : language === 'fr'
              ? 'Journal des transactions'
              : 'Transactions & Sales Collection'
          }
          liveRegionText={`${sortedSales.length} transactions`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            language === 'ar'
              ? 'البحث عن رقم الوصل، المشترك...'
              : language === 'fr'
              ? 'Rechercher ticket, client, produit...'
              : 'Search receipt ID, member, item...'
          }
          statusOptions={statusOptions}
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
          hasActiveAdvancedFilters={hasActiveAdvancedFilters}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
          viewMode={viewMode}
          onViewModeChange={(mode) => setViewMode(mode === 'grid' ? 'grid' : 'list')}
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <UniversalDataCollection<Sale>
          items={sortedSales}
          keyExtractor={(s) => s.id}
          viewMode={viewMode}
          hideToolbar
          openItemId={selectedSale?.id ?? null}
          sortBy={saleSortBy}
          sortDirection={saleSortDir}
          onSortChange={(key, dir) => {
            setSaleSortBy(key);
            setSaleSortDir(dir);
          }}
          selectedIds={selectedSaleIds}
          onSelectionChange={setSelectedSaleIds}
          pinnedIds={pinnedSaleIds}
          onPinToggle={(s: any) => {
            const id = typeof s === 'string' ? s : s.id;
            setPinnedSaleIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onItemClick={(sale, opener) => {
            setDrawerOpenerEl(opener || null);
            setSelectedSale(sale);
          }}
          onViewDetails={(sale, opener) => {
            setDrawerOpenerEl(opener || null);
            setSelectedSale(sale);
          }}
          columns={saleColumns}
          emptyTitle={language === 'ar' ? 'لا توجد معاملات' : 'No sales transactions found'}
          emptyDescription={
            language === 'ar'
              ? 'جرب تغيير شروط البحث أو مسح المرشحات'
              : 'Try adjusting your search terms or clearing filters.'
          }
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveAdvancedFilters || statusFilter !== 'All' || searchQuery.trim().length > 0}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedSales.length}
        entityPluralLabel={language === 'ar' ? 'معاملات' : language === 'fr' ? 'tickets' : 'receipts'}
        hasActiveFilters={hasActiveAdvancedFilters}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<Sale>
        isOpen={selectedSale !== null}
        item={selectedSale}
        allItems={sortedSales}
        keyExtractor={(s) => s.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={selectedSale?.memberName || (language === 'ar' ? 'زائر غير مسجل' : language === 'fr' ? 'Client de passage' : 'Guest Walk-In')}
        subtitle={selectedSale ? `#${selectedSale.id} · ${new Date(selectedSale.createdAt).toLocaleString()}` : undefined}
        avatarText={selectedSale ? (selectedSale.memberName || 'G').charAt(0).toUpperCase() : undefined}
        branchName={
          selectedSale
            ? resolveRecordBranch(selectedSale, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          selectedSale?.status === 'Refunded'
            ? language === 'ar' ? 'مسترجع' : language === 'fr' ? 'Remboursé' : 'Refunded'
            : language === 'ar' ? 'مسدد' : language === 'fr' ? 'Encaissé' : 'Settled'
        }
        statusClassName={
          selectedSale?.status === 'Refunded'
            ? 'bg-rose-50 text-rose-700 border border-rose-200'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }
        onClose={() => setSelectedSale(null)}
        onSelectItem={(sale) => setSelectedSale(sale)}
        renderBody={(sale) => (
          <div className="space-y-4 text-xs">
            {sale.status === 'Refunded' && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 space-y-1">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold">
                  <RotateCcw size={14} className="text-rose-600" />
                  <span>{language === 'ar' ? 'معاملة مسترجعة' : 'TRANSACTION REMBOURSÉE'}</span>
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-300">{sale.notes}</p>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] space-y-2">
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">
                  {language === 'ar' ? 'رقم الوصل:' : language === 'fr' ? 'Réf ticket :' : 'Receipt Ref:'}
                </span>
                <span className="font-mono font-bold text-[#d4522f]">#{sale.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">
                  {language === 'ar' ? 'طريقة الدفع:' : language === 'fr' ? 'Règlement :' : 'Payment Method:'}
                </span>
                <span className="font-bold text-black dark:text-white">{getLocalizedPaymentMethod(sale.paymentMethod)}</span>
              </div>
              {sale.customerPhone && (
                <div className="flex justify-between">
                  <span className="text-black/62 dark:text-white/65">
                    {language === 'ar' ? 'الهاتف:' : language === 'fr' ? 'Téléphone :' : 'Phone:'}
                  </span>
                  <span className="font-mono font-semibold text-black dark:text-white tabular-nums">{sale.customerPhone}</span>
                </div>
              )}
            </div>

            {sale.notes && !sale.notes.includes('REFUNDED') && (
              <div className="p-3.5 rounded-2xl bg-[#d4522f]/10 border border-[#d4522f]/20 space-y-1">
                <span className="text-[11px] font-semibold uppercase text-[#d4522f] flex items-center gap-1">
                  <Scissors size={12} />
                  <span>Notes</span>
                </span>
                <p className="text-xs font-semibold text-black dark:text-white">{sale.notes}</p>
              </div>
            )}

            <div className="border border-[#E6DED6] dark:border-[#3A3734] rounded-2xl divide-y divide-[#E6DED6]/60 dark:divide-[#3A3734] overflow-hidden">
              {sale.items.map((item, idx) => (
                <div key={idx} className="p-3.5 flex justify-between items-center bg-white dark:bg-[#262422]">
                  <div>
                    <div className="font-bold text-black dark:text-white">{item.productName}</div>
                    <div className="text-[11px] text-black/62 dark:text-white/65 tabular-nums mt-0.5">
                      {item.quantity} × {formatMoney(item.unitPrice)}
                    </div>
                  </div>
                  <span className="font-bold text-black dark:text-white tabular-nums">
                    {formatMoney(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex justify-between items-center">
              <span className="text-xs font-bold text-[#d4522f]">
                {language === 'ar' ? 'إجمالي المدفوع' : language === 'fr' ? 'Total Encaissé' : 'Total Settled'}
              </span>
              <span className="text-2xl font-bold tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans text-[#d4522f]">
                {formatMoney(sale.totalAmount)}
              </span>
            </div>

            <div className="space-y-2 pt-2">
              {sale.status !== 'Refunded' && (
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(true)}
                  className="w-full h-10 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <RotateCcw size={14} />
                  <span>
                    {language === 'ar'
                      ? 'استرجاع الوصل وإعادة للمخزون'
                      : language === 'fr'
                      ? 'Rembourser & Réintégrer au stock'
                      : 'Process Refund & Restock Items'}
                  </span>
                </button>
              )}
              <AtriumButton
                type="button"
                variant="secondary"
                onClick={() => window.print()}
                icon={<Printer size={15} />}
                className="w-full justify-center"
              >
                <span>
                  {language === 'ar'
                    ? 'طباعة الوصل الحراري'
                    : language === 'fr'
                    ? 'Imprimer le ticket thermique'
                    : 'Print Thermal Receipt'}
                </span>
              </AtriumButton>
            </div>
          </div>
        )}
      />

      {isRefundModalOpen && selectedSale && (
        <div className="fixed inset-0 z-[70] bg-[#1F1D1B]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1B1A] rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#E6DED6] dark:border-[#3A3734] shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-black dark:text-white">
                  {language === 'ar' ? 'تأكيد استرجاع المعاملة' : language === 'fr' ? 'Confirmer le remboursement' : 'Confirm Transaction Refund'}
                </h3>
                <p className="text-xs text-black/62 dark:text-white/65 tabular-nums">
                  #{selectedSale.id} • {formatMoney(selectedSale.totalAmount)}
                </p>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                {language === 'ar'
                  ? 'سيؤدي الاسترجاع إلى إعادة جميع الأصناف إلى مخزون الفرع.'
                  : language === 'fr'
                  ? "Ce remboursement réintégrera l'ensemble des articles au stock."
                  : 'Refunding will return all items back to available branch stock.'}
              </span>
            </div>
            <LabelSelect
              field="RefundReason"
              label={language === 'ar' ? 'سبب الاسترجاع *' : language === 'fr' ? 'Motif *' : 'Reason *'}
              value={refundReason}
              onChange={(val) => setRefundReason(val?.target?.value ?? String(val))}
              options={[
                'Customer return / exchange',
                'Wrong item rung up by cashier',
                'Defective or damaged product',
                'Customer changed mind before leaving',
                'Pricing / discount adjustment',
              ]}
              width="100%"
              height={46}
              corner={14}
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <AtriumButton type="button" variant="ghost" onClick={() => setIsRefundModalOpen(false)}>
                <span>{t('action_cancel', language)}</span>
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="danger"
                onClick={() => {
                  refundSale(selectedSale.id, refundReason);
                  setRefundSuccessToast(
                    language === 'ar'
                      ? `تم استرجاع الوصل #${selectedSale.id}`
                      : `Vente #${selectedSale.id} remboursée.`
                  );
                  setSelectedSale({ ...selectedSale, status: 'Refunded', notes: `REFUNDED: ${refundReason}` });
                  setIsRefundModalOpen(false);
                  setTimeout(() => setRefundSuccessToast(null), 5000);
                }}
              >
                <span>{language === 'ar' ? 'تأكيد الاسترجاع' : language === 'fr' ? 'Confirmer' : 'Confirm Refund'}</span>
              </AtriumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MembershipHistoryView.displayName = 'MembershipHistoryView';
export const HistoryScreen = MembershipHistoryView;
