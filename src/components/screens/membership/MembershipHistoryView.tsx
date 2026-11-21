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
import { useUndoHistory } from '../../../services/undoEngine';
import { EmbeddedUndoHistoryPanel } from '../../ui/EmbeddedUndoHistoryPanel';
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
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorListItem,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
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
    currentBusinessId,
    currentBranchId,
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
      currentBusinessId: s.currentBusinessId,
      currentBranchId: s.currentBranchId,
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
  const { entries: undoEntries } = useUndoHistory(currentBusinessId, currentBranchId);
  const membershipUndoCount = useMemo(
    () =>
      undoEntries.filter(
        (e) =>
          (e.vertical === 'membership_session' || e.vertical === 'settings') &&
          e.status === 'available'
      ).length,
    [undoEntries]
  );

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
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#F3EDE7] dark:bg-[#262422] flex items-center justify-center t-small font-semibold text-black/75 dark:text-white/80 shrink-0">
            {(sale.memberName || 'G').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="t-label font-semibold text-black dark:text-white truncate block">
              {sale.memberName ||
                (language === 'ar' ? 'زائر غير مسجل' : language === 'fr' ? 'Client de passage' : 'Guest Walk-In')}
            </span>
            <span className="t-small tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold block">
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
        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full t-small font-semibold bg-[#F3EDE7] dark:bg-[#262422] text-black/75 dark:text-white/80">
          {sale.paymentMethod === 'Cash' && <Banknote size={12} className="text-emerald-600" />}
          {sale.paymentMethod === 'Card' && <CreditCard size={12} className="text-blue-600" />}
          {sale.paymentMethod === 'Split' && <CreditCard size={12} className="text-purple-600" />}
          {sale.paymentMethod === 'MemberBalance' && <User size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />}
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
            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full t-small font-semibold ${
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
            className={`t-label font-semibold tabular-nums block ${
              sale.status === 'Refunded' ? 'line-through text-black/55 dark:text-white/55' : 'text-black dark:text-white'
            }`}
          >
            {formatMoney(sale.totalAmount)}
          </span>
          <span className="t-cap text-black/62 dark:text-white/65 block">
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
        <span className="t-small font-medium text-black/80 dark:text-white/85 truncate block">
          {resolveRecordBranch(sale, branchesById, currentBranch, language).name}
        </span>
      ),
    },
  ], [language, getLocalizedPaymentMethod, branchesById, currentBranch]);

  const statusOptions = useMemo(() => [
    { value: 'All', label: language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All', count: statusCounts.all },
    { value: 'Settled', label: language === 'ar' ? 'مسدد' : language === 'fr' ? 'Encaissé' : 'Settled', count: statusCounts.settled },
    { value: 'Refunded', label: language === 'ar' ? 'مسترجع' : language === 'fr' ? 'Remboursé' : 'Refunded', count: statusCounts.refunded },
    { value: 'Annulations', label: language === 'ar' ? 'الإلغاءات' : language === 'fr' ? 'Annulations' : 'Undos', count: membershipUndoCount },
  ], [language, statusCounts, membershipUndoCount]);

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

  const getRowMeta = useCallback(
    (sale: Sale): Partial<KineticRowData> => {
      const dateStr = new Date(sale.createdAt).toLocaleDateString();
      const timeStr = new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const itemsSummary = sale.items.map((it) => `${it.quantity}× ${it.productName}`).join(', ');
      const isRefunded = sale.status === 'Refunded';
      return {
        title: sale.memberName || (language === 'ar' ? 'زائر غير مسجل' : language === 'fr' ? 'Client de passage' : 'Guest Walk-In'),
        subline: `#${sale.id} · ${dateStr} ${timeStr}`,
        categoryLabel: getLocalizedPaymentMethod(sale.paymentMethod),
        statusLabel: isRefunded
          ? language === 'ar' ? 'مسترجع' : language === 'fr' ? 'Remboursé' : 'Refunded'
          : language === 'ar' ? 'مسدد' : language === 'fr' ? 'Encaissé' : 'Settled',
        statusVariant: isRefunded ? 'blocked' : 'active',
        metricPrimary: formatMoney(sale.totalAmount),
        metricSecondary: `${sale.items.length} ${language === 'ar' ? 'أصناف' : language === 'fr' ? 'articles' : 'items'}`,
        detailCol1: {
          heading: language === 'ar' ? 'العميل والتذكرة' : language === 'fr' ? 'Client & Ticket' : 'Customer & Ticket',
          primaryText: `#${sale.id}`,
          secondaryText: sale.customerPhone || dateStr,
          tertiaryText: timeStr,
        },
        detailCol2: {
          heading: language === 'ar' ? 'الأصناف والمبلغ' : language === 'fr' ? 'Panier & Total' : 'Basket & Total',
          primaryText: formatMoney(sale.totalAmount),
          secondaryText: `${sale.items.length} ${language === 'ar' ? 'منتجات' : language === 'fr' ? 'lignes' : 'items'}`,
          tertiaryText: getLocalizedPaymentMethod(sale.paymentMethod),
        },
        detailCol3: {
          heading: language === 'ar' ? 'تفاصيل الطلب' : language === 'fr' ? 'Articles & Notes' : 'Items & Notes',
          primaryText: itemsSummary || '—',
          secondaryText: sale.notes || resolveRecordBranch(sale, branchesById, currentBranch, language).name,
        },
      };
    },
    [language, getLocalizedPaymentMethod, branchesById, currentBranch]
  );

  const getFanActions = useCallback(
    (sale: Sale): KineticRowFanAction[] => [
      {
        id: 'print',
        label: language === 'ar' ? 'طباعة' : language === 'fr' ? 'Imprimer ticket' : 'Print Receipt',
        icon: <Printer className="w-[15px] h-[15px]" />,
        onClick: () => window.print(),
      },
      ...(sale.status !== 'Refunded'
        ? [
            {
              id: 'refund',
              label: language === 'ar' ? 'استرجاع' : language === 'fr' ? 'Rembourser' : 'Refund',
              icon: <RotateCcw className="w-[15px] h-[15px]" />,
              isDanger: true,
              onClick: () => {
                setSelectedSale(sale);
                setIsRefundModalOpen(true);
              },
            },
          ]
        : []),
    ],
    [language]
  );

  const getDetailActions = useCallback(
    (sale: Sale): KineticDetailAction[] => [
      {
        id: 'view',
        label: language === 'ar' ? 'التفاصيل' : language === 'fr' ? 'Fiche ticket' : 'Receipt',
        icon: <Receipt className="w-3.5 h-3.5" />,
        onClick: () => setSelectedSale(sale),
      },
      {
        id: 'print',
        label: language === 'ar' ? 'طباعة' : language === 'fr' ? 'Imprimer' : 'Print',
        icon: <Printer className="w-3.5 h-3.5" />,
        onClick: () => window.print(),
      },
      ...(sale.status !== 'Refunded'
        ? [
            {
              id: 'refund',
              label: language === 'ar' ? 'استرجاع' : language === 'fr' ? 'Rembourser' : 'Refund',
              icon: <RotateCcw className="w-3.5 h-3.5 text-[#c0283d]" />,
              onClick: () => {
                setSelectedSale(sale);
                setIsRefundModalOpen(true);
              },
            },
          ]
        : []),
    ],
    [language]
  );

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
        <div className="sq-elev-card">
          <div
            data-sq="ctl"
            data-sq-border="solid"
            className="p-4 bg-rose-50 dark:bg-rose-950/80 [--sq-stroke:#FDA4AF] dark:[--sq-stroke:#BE123C] text-rose-800 dark:text-rose-200 t-small font-semibold flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Check size={16} className="text-rose-600" />
              <span>{refundSuccessToast}</span>
            </div>
            <button type="button" onClick={() => setRefundSuccessToast(null)} className="text-rose-600 cursor-pointer rounded-full">
              <X size={14} />
            </button>
          </div>
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
          hasActiveAdvancedFilters={statusFilter !== 'Annulations' && hasActiveAdvancedFilters}
          activeFiltersCount={statusFilter === 'Annulations' ? 0 : activeFiltersCount}
          isFilterModalOpen={statusFilter !== 'Annulations' && isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={statusFilter === 'Annulations' ? undefined : () => setIsFilterModalOpen((p) => !p)}
          viewMode={viewMode}
          onViewModeChange={(mode) => setViewMode(mode === 'grid' ? 'grid' : 'list')}
          showViewToggle={statusFilter !== 'Annulations'}
          onExport={statusFilter === 'Annulations' ? undefined : handleExportCSV}
          activeChips={statusFilter === 'Annulations' ? [] : activeChips}
          onResetAllFilters={statusFilter === 'Annulations' ? undefined : handleResetFilters}
        />

        {statusFilter === 'Annulations' ? (
          <EmbeddedUndoHistoryPanel
            businessId={currentBusinessId}
            branchId={currentBranchId}
            vertical="membership_session"
            language={language}
            externalSearchQuery={searchQuery}
            onExternalSearchChange={setSearchQuery}
          />
        ) : (
          <UniversalDataCollection<Sale>
            items={sortedSales}
            keyExtractor={(s) => s.id}
            viewMode={viewMode}
            pageSize={50}
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
            getRowMeta={getRowMeta}
            getFanActions={getFanActions}
            getDetailActions={getDetailActions}
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
        )}
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
        avatarText={selectedSale ? (selectedSale.memberName || 'GW').slice(0, 2).toUpperCase() : undefined}
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
            ? 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]'
            : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
        }
        tabs={[
          { id: 'overview', label: language === 'ar' ? 'ملخص الوصل' : language === 'fr' ? 'Aperçu ticket' : 'Overview' },
          { id: 'items', label: language === 'ar' ? 'الأصناف' : language === 'fr' ? 'Articles' : 'Line Items' },
          { id: 'audit', label: language === 'ar' ? 'التدقيق' : language === 'fr' ? 'Audit & Retour' : 'Audit' },
        ]}
        holdToDelete={false}
        onClose={() => setSelectedSale(null)}
        onSelectItem={(sale) => setSelectedSale(sale)}
        renderBody={(sale, activeTab) => {
          const isRefunded = sale.status === 'Refunded';
          const methodName = getLocalizedPaymentMethod(sale.paymentMethod);

          if (activeTab === 'items') {
            return (
              <>
                <InspectorSection index={0} title={language === 'ar' ? 'قائمة الأصناف' : language === 'fr' ? 'Détail du panier' : 'Purchased Items'}>
                  <InspectorCard>
                    {sale.items.map((item, idx) => (
                      <InspectorListItem
                        key={idx}
                        title={item.productName}
                        subtitle={`${item.quantity} × ${formatMoney(item.unitPrice)}`}
                        metaRight={formatMoney(item.totalPrice)}
                        isLast={idx === sale.items.length - 1}
                      />
                    ))}
                  </InspectorCard>
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorBigStat
                    value={formatMoney(sale.totalAmount)}
                    tone={isRefunded ? 'danger' : 'ok'}
                    caption={`${sale.items.length} ${language === 'ar' ? 'أصناف' : language === 'fr' ? 'articles' : 'items'} · ${methodName}`}
                  />
                </InspectorSection>
              </>
            );
          }

          if (activeTab === 'audit') {
            return (
              <>
                <InspectorSection index={0} title={language === 'ar' ? 'تتبع العملية' : language === 'fr' ? 'Traçabilité POS' : 'Audit Trail'}>
                  <InspectorCard>
                    <InspectorKeyValue label={language === 'ar' ? 'رقم الوصل' : 'Ticket Ref'} value={`#${sale.id}`} />
                    <InspectorKeyValue
                      label={language === 'ar' ? 'تاريخ الإصدار' : 'Horodatage'}
                      value={new Date(sale.createdAt).toLocaleString()}
                    />
                    <InspectorKeyValue
                      label={language === 'ar' ? 'الحالة' : 'État'}
                      value={isRefunded ? 'REMBOURSÉ' : 'VALIDÉ'}
                      tone={isRefunded ? 'danger' : 'ok'}
                      isLast={!sale.notes}
                    />
                    {sale.notes && (
                      <InspectorKeyValue label="Notes" value={sale.notes} mono={false} isLast />
                    )}
                  </InspectorCard>
                </InspectorSection>
                {!isRefunded && (
                  <InspectorSection index={1}>
                    <InspectorWideButton
                      label={
                        language === 'ar'
                          ? 'استرجاع الوصل وإعادة للمخزون'
                          : language === 'fr'
                          ? 'Rembourser & Réintégrer au stock'
                          : 'Process Refund & Restock Items'
                      }
                      icon={<RotateCcw className="w-4 h-4" />}
                      tone="dark"
                      onClick={() => setIsRefundModalOpen(true)}
                    />
                  </InspectorSection>
                )}
              </>
            );
          }

          return (
            <>
              <InspectorSection index={0} title={language === 'ar' ? 'إجراءات سريعة' : language === 'fr' ? 'Actions rapides' : 'Quick Actions'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'print',
                      label: language === 'ar' ? 'طباعة الوصل' : language === 'fr' ? 'Ticket thermique' : 'Print Receipt',
                      icon: <Printer className="w-[18px] h-[18px]" />,
                      primary: true,
                      onClick: () => window.print(),
                    },
                    {
                      id: 'shop',
                      label: language === 'ar' ? 'نقطة البيع' : language === 'fr' ? 'Nouvelle vente' : 'Open Shop',
                      icon: <Receipt className="w-[18px] h-[18px]" />,
                      onClick: () => setScreen('shop'),
                    },
                    ...(!isRefunded
                      ? [
                          {
                            id: 'refund',
                            label: language === 'ar' ? 'استرجاع' : language === 'fr' ? 'Rembourser' : 'Refund',
                            icon: <RotateCcw className="w-[18px] h-[18px] text-[#c0283d]" />,
                            onClick: () => setIsRefundModalOpen(true),
                          },
                        ]
                      : []),
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1}>
                <InspectorBigStat
                  value={formatMoney(sale.totalAmount)}
                  tone={isRefunded ? 'danger' : 'accent'}
                  caption={`${methodName} · ${new Date(sale.createdAt).toLocaleDateString()}`}
                />
              </InspectorSection>

              <InspectorSection index={2} title={language === 'ar' ? 'معلومات العميل' : language === 'fr' ? 'Détails & Coordonnées' : 'Ticket Info'}>
                <InspectorCard>
                  <InspectorKeyValue label={language === 'ar' ? 'المرجع' : 'Réf ticket'} value={`#${sale.id}`} />
                  <InspectorKeyValue label={language === 'ar' ? 'طريقة الدفع' : 'Règlement'} value={methodName} mono={false} />
                  {sale.customerPhone && (
                    <InspectorKeyValue label={language === 'ar' ? 'الهاتف' : 'Téléphone'} value={sale.customerPhone} />
                  )}
                  <InspectorKeyValue
                    label={language === 'ar' ? 'الأصناف' : 'Articles'}
                    value={`${sale.items.length} ${language === 'ar' ? 'صنف' : 'articles'}`}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>

              {sale.notes && (
                <InspectorSection index={3} title={language === 'ar' ? 'ملاحظات' : 'Notes'}>
                  <InspectorCard>
                    <InspectorListItem title={sale.notes} badge={{ label: 'Note', tone: isRefunded ? 'danger' : 'accent' }} isLast />
                  </InspectorCard>
                </InspectorSection>
              )}
            </>
          );
        }}
      />

      {isRefundModalOpen && selectedSale && (
        <div className="fixed inset-0 z-[70] bg-[#1F1D1B]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="sq-elev-pop max-w-md w-full">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-[#262422] w-full p-6 space-y-5 [--sq-stroke:var(--sq-stroke-pop)]"
            >
              <div className="flex items-center gap-3">
                <div
                  data-sq="tile"
                  data-sq-border="none"
                  className="w-10 h-10 bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0"
                >
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="t-card font-semibold text-black dark:text-white">
                    {language === 'ar' ? 'تأكيد استرجاع المعاملة' : language === 'fr' ? 'Confirmer le remboursement' : 'Confirm Transaction Refund'}
                  </h3>
                  <p className="t-cap text-black/62 dark:text-white/65 tabular-nums">
                    #{selectedSale.id} • {formatMoney(selectedSale.totalAmount)}
                  </p>
                </div>
              </div>
              <div
                data-sq="card"
                data-sq-border="solid"
                className="p-4 bg-amber-50 dark:bg-amber-950/40 [--sq-stroke:#FDE68A] dark:[--sq-stroke:#92400E] t-cap text-amber-800 dark:text-amber-200 flex items-start gap-2"
              >
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
                corner={12}
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
        </div>
      )}
    </div>
  );
});

MembershipHistoryView.displayName = 'MembershipHistoryView';
export const HistoryScreen = MembershipHistoryView;
