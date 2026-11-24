import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  ClipboardList,
  Receipt,
  PauseCircle,
  PlayCircle,
  Trash2,
  Printer,
  RotateCcw,
  CreditCard,
  Banknote,
  Coins,
  Eye,
} from 'lucide-react';
import {
  selectCurrentBranchFromState,
  selectCurrentParkedOrdersFromState,
  selectCurrentSalesFromState,
  shallowEqualObjects,
  showToast,
  useAtriumActions,
  useAtriumSelector,
  useDashboardShellState,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { Sale, ParkedOrder } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { Modal } from '../../ui/Modal';
import { LabelInput } from '../../ui/LabelInput';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
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
  useRetainedModalValue,
} from '../../ui/kinetic';

const getInitials2 = (name: string): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return (name || 'TK').slice(0, 2).toUpperCase();
};

const MEMBER_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]';
const MEMBER_PILL_WARN =
  'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]';
const MEMBER_PILL_DANGER =
  'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]';

type SalesStatusFilter = 'all' | 'completed' | 'refunded';

export const PosOrdersView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const {
    setScreen,
    resumeParkedOrder,
    deleteParkedOrder,
    refundSale,
    batchDeleteSales,
  } = useAtriumActions();
  const { isSyncing, networkMode, retryCloudSync, lastSyncedAt, isSyncTimeout } =
    useDashboardShellState();
  const {
    sales,
    parkedOrders,
    currentBranch,
    branches,
    receiptConfig,
    currentUser,
  } = useAtriumSelector(
    (s) => ({
      sales: selectCurrentSalesFromState(s),
      parkedOrders: selectCurrentParkedOrdersFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      receiptConfig: s.receiptConfig,
      currentUser: s.currentUser,
    }),
    shallowEqualObjects
  );

  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'parked'>('sales');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | 'month'>('all');
  const [tenderFilter, setTenderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<SalesStatusFilter>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedSaleIds, setPinnedSaleIds] = useState<Set<string>>(() => new Set<string>());
  const [selectedParkedIds, setSelectedParkedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedParkedIds, setPinnedParkedIds] = useState<Set<string>>(() => new Set<string>());

  const [inspectingSale, setInspectingSale] = useState<Sale | null>(null);
  const [inspectingParked, setInspectingParked] = useState<ParkedOrder | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('overview');
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [selectedSaleForRefund, setSelectedSaleForRefund] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState('Demande Client / Avoir');
  const retainedSaleForReceipt = useRetainedModalValue(selectedSaleForReceipt);
  const retainedSaleForRefund = useRetainedModalValue(selectedSaleForRefund);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchSales = useMemo(
    () =>
      sales.filter(
        (s) => s.facilityId === currentBranch.id || s.id.startsWith('sale_pos_')
      ),
    [sales, currentBranch.id]
  );

  const salesKpis = useMemo(() => {
    let totalGross = 0;
    let totalRefunded = 0;
    let completedCount = 0;
    let refundedCount = 0;
    const branchCounts = new Map<string, number>();

    branchSales.forEach((s) => {
      const bName = resolveRecordBranch(s, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
      if (s.status === 'Refunded') {
        totalRefunded += s.totalAmount;
        refundedCount++;
      } else {
        totalGross += s.totalAmount;
        completedCount++;
      }
    });

    const netRevenue = Math.max(0, totalGross - totalRefunded);

    return {
      totalGross,
      totalRefunded,
      netRevenue,
      completedCount,
      refundedCount,
      completionRate:
        branchSales.length > 0 ? Math.round((completedCount / branchSales.length) * 100) : 100,
      branchOptionsWithCounts: Array.from(branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    };
  }, [branchSales, branchesById, currentBranch, language]);

  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const q = searchQuery.trim().toLowerCase();

    return branchSales.filter((s) => {
      if (dateFilter === 'today' && !s.createdAt.startsWith(todayStr)) return false;
      if (dateFilter === '7days' && s.createdAt < sevenDaysAgo) return false;
      if (dateFilter === 'month' && s.createdAt < monthStart) return false;
      if (tenderFilter !== 'all' && s.paymentMethod !== tenderFilter) return false;
      if (statusFilter === 'completed' && s.status === 'Refunded') return false;
      if (statusFilter === 'refunded' && s.status !== 'Refunded') return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(s, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const bName = resolveRecordBranch(s, branchesById, currentBranch, language).name.toLowerCase();
        const matchesId = s.id.toLowerCase().includes(q);
        const matchesName = (s.memberName || '').toLowerCase().includes(q);
        const matchesPhone = (s.customerPhone || '').toLowerCase().includes(q);
        const matchesCashier = (s.cashierName || '').toLowerCase().includes(q);
        const matchesItem = s.items.some((it) => it.productName.toLowerCase().includes(q));
        if (!matchesId && !matchesName && !matchesPhone && !matchesCashier && !matchesItem && !bName.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [branchSales, dateFilter, tenderFilter, statusFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedSales = useMemo(() => {
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filteredSales].sort((a, b) => {
      const aPinned = pinnedSaleIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedSaleIds.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      if (sortBy === 'customer') {
        return (a.memberName || '').localeCompare(b.memberName || '') * sign;
      }
      if (sortBy === 'tender') {
        return a.paymentMethod.localeCompare(b.paymentMethod) * sign;
      }
      if (sortBy === 'total') {
        return (a.totalAmount - b.totalAmount) * sign;
      }
      if (sortBy === 'status') {
        return (a.status || 'Completed').localeCompare(b.status || 'Completed') * sign;
      }
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * sign;
      }
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * sign;
    });
  }, [filteredSales, pinnedSaleIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const filteredParkedOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return parkedOrders.filter((po) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(po, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const matchesId = po.id.toLowerCase().includes(q);
        const matchesRef = po.referenceName.toLowerCase().includes(q);
        const matchesCashier = ((po as any).cashierName || '').toLowerCase().includes(q);
        if (!matchesId && !matchesRef && !matchesCashier) return false;
      }
      return true;
    });
  }, [parkedOrders, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedParkedOrders = useMemo(() => {
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filteredParkedOrders].sort((a, b) => {
      const aPinned = pinnedParkedIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedParkedIds.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      if (sortBy === 'reference') return a.referenceName.localeCompare(b.referenceName) * sign;
      if (sortBy === 'total') return (a.totalAmount - b.totalAmount) * sign;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * sign;
    });
  }, [filteredParkedOrders, pinnedParkedIds, sortBy, sortDir]);

  const handleResetFilters = useCallback(() => {
    setDateFilter('all');
    setTenderFilter('all');
    setStatusFilter('all');
    setBranchFilter('All');
    setSearchQuery('');
    setIsFilterModalOpen(false);
  }, []);

  const hasActiveAdvancedFilters =
    dateFilter !== 'all' || tenderFilter !== 'all' || branchFilter !== 'All';
  const activeFiltersCount =
    (dateFilter !== 'all' ? 1 : 0) +
    (tenderFilter !== 'all' ? 1 : 0) +
    (branchFilter !== 'All' ? 1 : 0);

  const handleExportCSV = useCallback(() => {
    if (activeSubTab === 'parked') {
      const headers = ['ID', 'Reference', 'Items', 'Total (DA)', 'Created At', isAr ? 'الفرع' : 'Branche'];
      const rows = sortedParkedOrders.map((po) => [
        po.id,
        po.referenceName,
        po.items.map((it) => `${it.quantity}x ${it.productName}`).join(' | '),
        po.totalAmount,
        new Date(po.createdAt).toLocaleString(),
        resolveRecordBranch(po, branchesById, currentBranch, language).name,
      ]);
      downloadCsvSafe(`atrium-pos-parked-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
      return;
    }

    const headers = [
      'Receipt #',
      'Date & Time',
      'Customer',
      'Phone',
      'Payment Method',
      'Cashier',
      'Subtotal (DA)',
      'Total (DA)',
      'Status',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
    ];
    const rows = sortedSales.map((s) => [
      `#${s.id.slice(-8).toUpperCase()}`,
      new Date(s.createdAt).toLocaleString(),
      s.memberName || 'Client de passage',
      s.customerPhone || '',
      s.paymentMethod,
      s.cashierName || 'Caisse',
      s.subtotal || s.totalAmount,
      s.totalAmount,
      s.status || 'Completed',
      resolveRecordBranch(s, branchesById, currentBranch, language).name,
    ]);
    downloadCsvSafe(`atrium-pos-sales-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [activeSubTab, sortedParkedOrders, sortedSales, branchesById, currentBranch, language, isAr, isEn]);

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: branchSales.length },
      { value: 'completed', label: isAr ? 'مسدد' : isEn ? 'Paid' : 'Encaissés', count: salesKpis.completedCount },
      { value: 'refunded', label: isAr ? 'مرتجع' : isEn ? 'Refunded' : 'Avoirs', count: salesKpis.refundedCount },
    ],
    [isAr, isEn, branchSales.length, salesKpis.completedCount, salesKpis.refundedCount]
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
          { value: 'All', label: isAr ? 'كل الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: branchSales.length },
          ...salesKpis.branchOptionsWithCounts,
        ],
      },
      {
        id: 'date',
        label: isAr ? 'الفترة الزمنية' : isEn ? 'Date Range' : 'Période',
        value: dateFilter,
        onChange: (val) => setDateFilter(val as any),
        kind: 'segmented',
        options: [
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes' },
          { value: 'today', label: isAr ? 'اليوم' : isEn ? 'Today' : 'Aujourd’hui' },
          { value: '7days', label: isAr ? '7 أيام' : '7j' },
          { value: 'month', label: isAr ? 'الشهر' : isEn ? 'Month' : 'Mois' },
        ],
      },
      {
        id: 'tender',
        label: isAr ? 'طريقة الدفع' : isEn ? 'Payment Method' : 'Mode de règlement',
        value: tenderFilter,
        onChange: setTenderFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'all', label: isAr ? 'الكل' : isEn ? 'All Methods' : 'Tous modes' },
          { value: 'Cash', label: isAr ? 'نقداً' : isEn ? 'Cash' : 'Espèces' },
          { value: 'Card', label: 'CIB / Edahabia' },
          { value: 'BankTransfer', label: 'BaridiMob' },
          { value: 'Split', label: isAr ? 'مقسم' : isEn ? 'Split' : 'Mixte' },
        ],
      },
      {
        id: 'status',
        label: isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
        value: statusFilter,
        onChange: (val) => setStatusFilter(val as SalesStatusFilter),
        kind: 'segmented',
        options: statusOptions,
      },
    ],
    [isAr, isEn, branchFilter, branchSales.length, salesKpis.branchOptionsWithCounts, dateFilter, tenderFilter, statusFilter, statusOptions]
  );

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') chips.push({ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') });
    if (dateFilter !== 'all') chips.push({ key: 'date', label: dateFilter === 'today' ? 'Aujourd’hui' : dateFilter === '7days' ? '7 derniers jours' : 'Ce mois', onRemove: () => setDateFilter('all') });
    if (tenderFilter !== 'all') chips.push({ key: 'tender', label: tenderFilter, onRemove: () => setTenderFilter('all') });
    return chips;
  }, [branchFilter, dateFilter, tenderFilter]);

  const salesColumns: ColumnDefinition<Sale>[] = useMemo(
    () => [
      {
        key: 'id',
        header: isAr ? 'رقم الوصل' : 'N° Ticket',
        width: '130px',
        sortable: true,
        renderCell: (s) => (
          <div>
            <span className="tabular-nums font-semibold t-small text-black dark:text-white block">
              #{s.id.slice(-6).toUpperCase()}
            </span>
            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums block">
              {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ),
      },
      {
        key: 'customer',
        header: isAr ? 'الزبون / العميل' : isEn ? 'Customer' : 'Client',
        minWidth: '160px',
        sortable: true,
        renderCell: (s) => (
          <div className="min-w-0">
            <div className="font-semibold t-small text-black dark:text-white truncate">
              {s.memberName || t('shop_receipt_walkin')}
            </div>
            {s.customerPhone && (
              <div className="t-cap text-black/55 dark:text-white/55 tabular-nums truncate">
                {s.customerPhone}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'items',
        header: isAr ? 'المحتويات' : isEn ? 'Items' : 'Articles',
        minWidth: '180px',
        renderCell: (s) => (
          <div className="flex items-center gap-2 flex-wrap">
            {s.items.slice(0, 2).map((it, idx) => (
              <span
                key={idx}
                className="t-small text-black/70 dark:text-white/75 font-medium bg-[#EFE9E2] dark:bg-[#2B2825] px-2 py-1 rounded-[var(--r-check,6px)]"
              >
                {it.quantity}x {it.productName.split('(')[0].trim()}
              </span>
            ))}
            {s.items.length > 2 && (
              <span className="t-small font-semibold text-black/55 dark:text-white/55">
                +{s.items.length - 2}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'tender',
        header: isAr ? 'طريقة الدفع' : isEn ? 'Tender' : 'Règlement',
        width: '130px',
        sortable: true,
        renderCell: (s) => {
          const isCash = s.paymentMethod === 'Cash';
          const isCard = s.paymentMethod === 'Card';
          const label = isCash
            ? isAr ? 'نقداً (DZD)' : 'Espèces'
            : isCard
            ? 'CIB / Edahabia'
            : s.paymentMethod;
          return (
            <div className="flex items-center gap-2 t-cap">
              {isCash ? (
                <Banknote size={14} className="text-emerald-500 shrink-0" />
              ) : isCard ? (
                <CreditCard size={14} className="text-blue-500 shrink-0" />
              ) : (
                <Coins size={14} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              )}
              <span className="font-medium text-black dark:text-white truncate">{label}</span>
            </div>
          );
        },
      },
      {
        key: 'total',
        header: isAr ? 'المبلغ الصافي' : isEn ? 'Total Net' : 'Total Payé',
        width: '125px',
        sortable: true,
        renderCell: (s) => (
          <span className="tabular-nums font-semibold t-small text-black dark:text-white">
            {formatMoney(s.totalAmount)}
          </span>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
        width: '105px',
        sortable: true,
        renderCell: (s) => {
          const isRefunded = s.status === 'Refunded';
          return (
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full t-small font-semibold ${
                isRefunded
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              }`}
            >
              {isRefunded ? (isAr ? 'مسترجع' : 'Remboursé') : isAr ? 'مسدد' : 'Encaissé'}
            </span>
          );
        },
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '120px',
        sortable: true,
        renderCell: (s) => (
          <span className="t-small font-medium text-black/75 dark:text-white/80 truncate block">
            {resolveRecordBranch(s, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '110px',
        renderCell: (s) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSaleForReceipt(s);
              }}
              data-sq="ctl-sm"
              data-sq-border="solid"
              className="h-8 px-2.5 hover:bg-[#FAF6F1] dark:hover:bg-[#2B2825] t-small font-semibold text-black/70 dark:text-white flex items-center gap-1 cursor-pointer transition-colors"
              title="Ticket Thermique 80mm"
            >
              <Printer size={13} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
              <span>{isAr ? 'وصل' : 'Reçu'}</span>
            </button>
            {s.status !== 'Refunded' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSaleForRefund(s);
                }}
                data-sq="ctl-sm"
                data-sq-border="none"
                className="h-8 px-2 text-black/55 dark:text-white/55 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                title="Refund / Avoir"
              >
                <RotateCcw size={13} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [isAr, isEn, t, branchesById, currentBranch, language]
  );

  const parkedColumns: ColumnDefinition<ParkedOrder>[] = useMemo(
    () => [
      {
        key: 'reference',
        header: isAr ? 'اسم التذكرة المعلقة' : 'Référence / Client',
        minWidth: '180px',
        sortable: true,
        renderCell: (po) => (
          <div>
            <span className="font-semibold t-small text-black dark:text-white block">
              {po.referenceName}
            </span>
            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
              {new Date(po.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {(po as any).cashierName || 'Caisse'}
            </span>
          </div>
        ),
      },
      {
        key: 'items',
        header: isAr ? 'المحتويات' : 'Articles en Pause',
        minWidth: '200px',
        renderCell: (po) => (
          <div className="flex items-center gap-2 flex-wrap">
            {po.items.slice(0, 3).map((it, idx) => (
              <span
                key={idx}
                className="px-2 py-1 rounded-[var(--r-check,6px)] bg-[#EFE9E2] dark:bg-[#2B2825] t-small font-medium text-black/70 dark:text-white/75"
              >
                {it.quantity}x {it.productName}
              </span>
            ))}
            {po.items.length > 3 && (
              <span className="t-small font-semibold text-black/55 dark:text-white/55">
                +{po.items.length - 3}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'total',
        header: isAr ? 'المجموع' : 'Total Dû',
        width: '130px',
        sortable: true,
        renderCell: (po) => (
          <span className="tabular-nums font-semibold t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
            {formatMoney(po.totalAmount)}
          </span>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '120px',
        sortable: true,
        renderCell: (po) => (
          <span className="t-small font-medium text-black/75 dark:text-white/80 truncate block">
            {resolveRecordBranch(po, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '150px',
        renderCell: (po) => (
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resumeParkedOrder(po.id);
                setScreen('shop');
              }}
              data-sq="ctl-sm"
              data-sq-border="none"
              className="h-8 px-3 bg-[var(--brand-fill,#C9461F)] text-white t-small font-semibold flex items-center gap-1 hover:opacity-90 cursor-pointer"
            >
              <PlayCircle size={13} />
              <span>{isAr ? 'استئناف' : 'Reprendre'}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                deleteParkedOrder(po.id);
              }}
              data-sq="ctl-sm"
              data-sq-border="none"
              className="h-8 px-2 text-black/55 dark:text-white/55 hover:text-rose-500 cursor-pointer"
              title="Supprimer le ticket"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language, setScreen, resumeParkedOrder, deleteParkedOrder]
  );

  const handleConfirmRefund = () => {
    if (!selectedSaleForRefund) return;
    refundSale(selectedSaleForRefund.id, refundReason);
    setSelectedSaleForRefund(null);
  };

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
          { width: '1.5*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '100px', minWidth: '80px' },
        ]}
        viewMode={viewMode}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #pos-orders-thermal-receipt, #pos-orders-thermal-receipt * {
            visibility: visible !important;
          }
          #pos-orders-thermal-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 8px !important;
            font-size: 12px !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      <ScreenHeaderBar
        icon={<ClipboardList size={22} />}
        title={isAr ? 'الطلبات' : isEn ? 'Orders' : 'Commandes'}
        secondaryActions={
          <LiveSegmentedControl
            size="md"
            value={activeSubTab}
            onValueChange={(val) => setActiveSubTab(val as 'sales' | 'parked')}
            options={[
              {
                value: 'sales',
                label: isAr ? 'المبيعات' : isEn ? 'Sales' : 'Encaissés',
                icon: <Receipt size={14} />,
                count: branchSales.length,
              },
              {
                value: 'parked',
                label: isAr ? 'المعلقة' : isEn ? 'Parked' : 'En pause',
                icon: <PauseCircle size={14} />,
                count: parkedOrders.length,
              },
            ]}
            aria-label="Orders Mode Switcher"
          />
        }
        primaryAction={{
          label: isAr ? 'نقطة البيع' : isEn ? 'Register' : 'Caisse',
          icon: <Receipt size={15} />,
          onClick: () => setScreen('shop'),
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'حجم المبيعات والتذاكر' : isEn ? 'Sales Volume & Settlements' : 'Volume des Ventes & Encaissements'}
        language={language}
        primaryCard={{
          label: isAr ? 'التذاكر المسددة' : isEn ? 'Completed Sales' : 'Tickets Encaissés',
          badgeText: `${salesKpis.completionRate}% encaissés`,
          count: salesKpis.completedCount,
          tone: 'emerald',
          isActive: statusFilter === 'completed' && activeSubTab === 'sales',
          onToggle: () => {
            setActiveSubTab('sales');
            setStatusFilter((p) => (p === 'completed' ? 'all' : 'completed'));
          },
        }}
        secondaryCard={{
          label: isAr ? 'المرتجعات والمعلقة' : isEn ? 'Refunds & Hold' : 'Avoirs & Tickets en Pause',
          badgeText: `${parkedOrders.length} en pause`,
          count: salesKpis.refundedCount,
          tone: 'terracotta',
          isActive: statusFilter === 'refunded' && activeSubTab === 'sales',
          onToggle: () => {
            setActiveSubTab('sales');
            setStatusFilter((p) => (p === 'refunded' ? 'all' : 'refunded'));
          },
        }}
        darkCard={{
          label: isAr ? 'صافي الإيرادات المقبوضة' : isEn ? 'Net Collected Revenue' : 'Chiffre d’Affaires Net Encaissé',
          badgePrefix: '',
          badgeCount: branchSales.length,
          badgeSuffix: isAr ? 'وصل' : 'tickets',
          valuePrefix: '',
          valueCount: salesKpis.netRevenue,
          formatValue: (n) => formatMoney(n),
          caption: `${currentBranch?.name || 'Magasin'} · ${isAr ? 'مجموع صافي بعد الخصومات' : 'Déduction faite des avoirs'}`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            activeSubTab === 'sales'
              ? isAr ? 'سجل تذاكر المبيعات' : isEn ? 'Sales Ledger' : 'Grand Livre des Encaissements'
              : isAr ? 'التذاكر المعلقة' : isEn ? 'Parked Carts' : 'Paniers Mis en Pause'
          }
          liveRegionText={
            activeSubTab === 'sales'
              ? `${sortedSales.length} tickets`
              : `${sortedParkedOrders.length} tickets en pause`
          }
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث برقم الوصل، الزبون أو الفرع...' : 'Filtrer N° ticket, client, branche...'}
          statusOptions={activeSubTab === 'sales' ? statusOptions : undefined}
          statusValue={statusFilter}
          onStatusChange={(val) => setStatusFilter(val as SalesStatusFilter)}
          hasActiveAdvancedFilters={hasActiveAdvancedFilters}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        {activeSubTab === 'sales' ? (
          <UniversalDataCollection<Sale>
            items={sortedSales}
            columns={salesColumns}
            keyExtractor={(s) => s.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode="list"
            hideToolbar
            openItemId={inspectingSale?.id ?? null}
            isLoading={isSyncing || networkMode === 'force_skeleton'}
            isOffline={networkMode === 'offline'}
            isTimedOut={isSyncTimeout}
            lastSyncedAt={lastSyncedAt}
            onRetrySync={retryCloudSync}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(col, dir) => {
              setSortBy(col);
              setSortDir(dir);
            }}
            onItemClick={(s, opener) => {
              setDrawerOpenerEl(opener || null);
              setInspectorTab('overview');
              setInspectingSale(s);
            }}
            onViewDetails={(s, opener) => {
              setDrawerOpenerEl(opener || null);
              setInspectorTab('overview');
              setInspectingSale(s);
            }}
            onDelete={(s) => {
              batchDeleteSales([s.id]);
              if (inspectingSale?.id === s.id) setInspectingSale(null);
            }}
            getRowMeta={(s): Partial<KineticRowData> => {
              const isRefunded = s.status === 'Refunded';
              const branchInfo = resolveRecordBranch(s, branchesById, currentBranch, language);
              const customerLabel = s.memberName || t('shop_receipt_walkin');
              return {
                title: `#${s.id.slice(-6).toUpperCase()} · ${customerLabel}`,
                subline: `${new Date(s.createdAt).toLocaleString()} · ${s.cashierName || 'Caisse'}`,
                avatarText: s.memberName ? getInitials2(s.memberName) : 'TK',
                categoryLabel: s.paymentMethod === 'Cash' ? (isAr ? 'نقداً' : 'Espèces') : s.paymentMethod === 'Card' ? 'CIB / Edahabia' : s.paymentMethod,
                statusLabel: isRefunded ? (isAr ? 'مسترجع' : 'Remboursé') : isAr ? 'مسدد' : 'Encaissé',
                statusVariant: isRefunded ? 'blocked' : 'active',
                metricPrimary: formatMoney(s.totalAmount),
                metricSecondary: `${s.items.length} article(s)`,
                branchName: branchInfo.name,
                branchCode: branchInfo.code,
                isPinned: pinnedSaleIds.has(s.id),
                detailCol1: {
                  heading: isAr ? 'التذكرة' : 'Ticket',
                  primaryText: `#${s.id.slice(-8).toUpperCase()}`,
                  secondaryText: customerLabel,
                  tertiaryText: s.customerPhone || branchInfo.name,
                },
                detailCol2: {
                  heading: isAr ? 'التسوية' : 'Règlement',
                  primaryText: formatMoney(s.totalAmount),
                  secondaryText: s.paymentMethod,
                  tertiaryText: s.cashierName || currentUser?.fullName || 'Caisse',
                },
                detailCol3: {
                  heading: isAr ? 'المحتويات' : 'Articles',
                  primaryText: `${s.items.length} ligne(s)`,
                  secondaryText: s.items.slice(0, 2).map((it) => `${it.quantity}× ${it.productName}`).join(', '),
                },
              };
            }}
            getFanActions={(s): KineticRowFanAction[] => [
              {
                id: 'receipt',
                label: isAr ? 'طباعة الوصل' : 'Ticket 80mm',
                icon: <Printer className="w-[15px] h-[15px]" />,
                onClick: (e) => {
                  e.stopPropagation();
                  setSelectedSaleForReceipt(s);
                },
              },
              ...(s.status !== 'Refunded'
                ? [
                    {
                      id: 'refund',
                      label: isAr ? 'استرجاع' : 'Avoir',
                      icon: <RotateCcw className="w-[15px] h-[15px]" />,
                      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        setSelectedSaleForRefund(s);
                      },
                    },
                  ]
                : []),
              {
                id: 'archive',
                label: isAr ? 'أرشفة' : 'Archiver',
                icon: <Trash2 className="w-[15px] h-[15px]" />,
                isDanger: true,
                onClick: () => {
                  batchDeleteSales([s.id]);
                  if (inspectingSale?.id === s.id) setInspectingSale(null);
                },
              },
            ]}
            getDetailActions={(s): KineticDetailAction[] => [
              {
                id: 'inspect',
                label: isAr ? 'تفاصيل الوصل' : 'Ouvrir ticket',
                icon: <Eye className="w-3.5 h-3.5" />,
                onClick: () => {
                  setInspectorTab('overview');
                  setInspectingSale(s);
                },
              },
              {
                id: 'receipt',
                label: isAr ? 'وصل 80 مم' : 'Reçu 80mm',
                icon: <Printer className="w-3.5 h-3.5" />,
                onClick: () => setSelectedSaleForReceipt(s),
              },
              ...(s.status !== 'Refunded'
                ? [
                    {
                      id: 'refund',
                      label: isAr ? 'استرجاع' : 'Rembourser',
                      icon: <RotateCcw className="w-3.5 h-3.5" />,
                      onClick: () => setSelectedSaleForRefund(s),
                    },
                  ]
                : []),
            ]}
            selectedIds={selectedSaleIds}
            onSelectionChange={setSelectedSaleIds}
            bulkSecondaryAction={{
              label: 'Imprimer reçus',
              icon: <Printer size={13} />,
              onClick: (ids) => {
                showToast({
                  type: 'info',
                  title: 'Impression en lot',
                  message: `${ids.size} reçus envoyés à l'imprimante thermique.`,
                });
              },
              variant: 'primary',
            }}
            onBulkDelete={(ids) => {
              batchDeleteSales(Array.from(ids));
              setSelectedSaleIds(new Set<string>());
            }}
            pinnedIds={pinnedSaleIds}
            onPinToggle={(idOrItem) => {
              const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
              setPinnedSaleIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            emptyTitle={isAr ? 'لا توجد مبيعات مطابقة' : 'Aucune vente trouvée'}
            emptyDescription={isAr ? 'لا توجد نتائج مطابقة لمعايير البحث الحالية.' : 'Aucun ticket ne correspond à vos filtres.'}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveAdvancedFilters || statusFilter !== 'all' || searchQuery.trim().length > 0}
          />
        ) : (
          <UniversalDataCollection<ParkedOrder>
            items={sortedParkedOrders}
            columns={parkedColumns}
            keyExtractor={(po) => po.id}
            viewMode={viewMode === 'grid' ? 'grid' : 'list'}
            defaultViewMode="list"
            hideToolbar
            openItemId={inspectingParked?.id ?? null}
            isLoading={isSyncing || networkMode === 'force_skeleton'}
            isOffline={networkMode === 'offline'}
            isTimedOut={isSyncTimeout}
            lastSyncedAt={lastSyncedAt}
            onRetrySync={retryCloudSync}
            sortBy={sortBy}
            sortDirection={sortDir}
            onSortChange={(col, dir) => {
              setSortBy(col);
              setSortDir(dir);
            }}
            onItemClick={(po, opener) => {
              setDrawerOpenerEl(opener || null);
              setInspectorTab('overview');
              setInspectingParked(po);
            }}
            onViewDetails={(po, opener) => {
              setDrawerOpenerEl(opener || null);
              setInspectorTab('overview');
              setInspectingParked(po);
            }}
            getRowMeta={(po): Partial<KineticRowData> => {
              const branchInfo = resolveRecordBranch(po, branchesById, currentBranch, language);
              return {
                title: po.referenceName,
                subline: `${new Date(po.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${(po as any).cashierName || 'Caisse'}`,
                avatarText: getInitials2(po.referenceName),
                categoryLabel: isAr ? 'سلة معلقة' : 'En attente',
                statusLabel: isAr ? 'معلق' : 'En pause',
                statusVariant: 'warning',
                metricPrimary: formatMoney(po.totalAmount),
                metricSecondary: `${po.items.length} article(s)`,
                branchName: branchInfo.name,
                branchCode: branchInfo.code,
                isPinned: pinnedParkedIds.has(po.id),
              };
            }}
            getFanActions={(po): KineticRowFanAction[] => [
              {
                id: 'resume',
                label: isAr ? 'استئناف في الكاشير' : 'Reprendre en caisse',
                icon: <PlayCircle className="w-[15px] h-[15px]" />,
                onClick: (e) => {
                  e.stopPropagation();
                  resumeParkedOrder(po.id);
                  setScreen('shop');
                },
              },
              {
                id: 'del',
                label: isAr ? 'حذف' : 'Supprimer',
                icon: <Trash2 className="w-[15px] h-[15px]" />,
                isDanger: true,
                onClick: () => deleteParkedOrder(po.id),
              },
            ]}
            getDetailActions={(po): KineticDetailAction[] => [
              {
                id: 'resume',
                label: isAr ? 'استئناف' : 'Reprendre',
                icon: <PlayCircle className="w-3.5 h-3.5" />,
                onClick: () => {
                  resumeParkedOrder(po.id);
                  setScreen('shop');
                },
              },
              {
                id: 'inspect',
                label: isAr ? 'معاينة' : 'Détails',
                icon: <Eye className="w-3.5 h-3.5" />,
                onClick: () => {
                  setInspectorTab('overview');
                  setInspectingParked(po);
                },
              },
            ]}
            selectedIds={selectedParkedIds}
            onSelectionChange={setSelectedParkedIds}
            bulkSecondaryAction={{
              label: isAr ? 'استئناف التذكرة' : 'Reprendre en caisse',
              icon: <PlayCircle size={13} />,
              onClick: (ids) => {
                const firstId = Array.from(ids)[0];
                if (firstId) {
                  resumeParkedOrder(firstId);
                  setScreen('shop');
                }
              },
              variant: 'primary',
            }}
            onBulkDelete={(ids) => {
              if (ids.size === 0) return;
              runUndoBatch(
                {
                  vertical: 'pos_inventory',
                  operationType: 'bulk',
                  affectedCount: ids.size,
                  summary: isAr
                    ? `حذف تذاكر معلقة (${ids.size})`
                    : isEn
                    ? `Delete parked orders (${ids.size})`
                    : `Suppression tickets en attente (${ids.size})`,
                },
                () => {
                  ids.forEach((id) => deleteParkedOrder(id));
                }
              );
              setSelectedParkedIds(new Set<string>());
            }}
            pinnedIds={pinnedParkedIds}
            onPinToggle={(idOrItem) => {
              const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
              setPinnedParkedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            emptyTitle={isAr ? 'لا توجد تذاكر معلقة' : 'Aucun ticket en attente'}
            emptyDescription={isAr ? 'جميع الطلبات تمت معالجتها.' : 'Tous les encaissements ont été finalisés.'}
          />
        )}
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={activeSubTab === 'sales' ? sortedSales.length : sortedParkedOrders.length}
        entityPluralLabel={isAr ? 'تذاكر' : 'tickets'}
        hasActiveFilters={hasActiveAdvancedFilters}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<Sale>
        isOpen={inspectingSale !== null}
        item={inspectingSale}
        allItems={sortedSales}
        keyExtractor={(s) => s.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectingSale ? `Ticket #${inspectingSale.id.slice(-8).toUpperCase()}` : ''}
        subtitle={inspectingSale ? `${inspectingSale.memberName || t('shop_receipt_walkin')} · ${new Date(inspectingSale.createdAt).toLocaleString()}` : undefined}
        avatarText={inspectingSale?.memberName ? getInitials2(inspectingSale.memberName) : 'TK'}
        avatarColor="#d4522f"
        branchName={inspectingSale ? resolveRecordBranch(inspectingSale, branchesById, currentBranch, language).name : undefined}
        statusLabel={inspectingSale?.status === 'Refunded' ? (isAr ? 'مسترجع' : 'Remboursé') : isAr ? 'مسدد' : 'Encaissé'}
        statusClassName={inspectingSale?.status === 'Refunded' ? MEMBER_PILL_DANGER : MEMBER_PILL_OK}
        tabs={[
          { id: 'overview', label: isAr ? 'الملخص' : isEn ? 'Overview' : 'Ticket' },
          { id: 'items', label: isAr ? 'المحتويات' : isEn ? 'Items' : 'Articles' },
          { id: 'actions', label: isAr ? 'إجراءات' : isEn ? 'Actions' : 'Actions' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onClose={() => setInspectingSale(null)}
        onSelectItem={(s) => {
          setInspectorTab('overview');
          setInspectingSale(s);
        }}
        holdToDelete
        deleteLabel={isAr ? 'أرشفة' : 'Archiver'}
        onDelete={(s) => {
          batchDeleteSales([s.id]);
          setInspectingSale(null);
        }}
        renderBody={(sale, tab) => {
          if (tab === 'items') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title={`${sale.items.length} ${isAr ? 'أصناف' : 'articles encaissés'}`}>
                  <InspectorCard>
                    {sale.items.map((it, idx) => (
                      <InspectorListItem
                        key={idx}
                        title={it.productName}
                        subtitle={`${it.quantity} × ${formatMoney(it.unitPrice)}`}
                        metaRight={formatMoney(it.totalPrice)}
                        isLast={idx === sale.items.length - 1}
                      />
                    ))}
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
                        label: isAr ? 'وصل 80 مم' : 'Ticket 80mm',
                        icon: <Printer size={16} />,
                        primary: true,
                        onClick: () => setSelectedSaleForReceipt(sale),
                      },
                      ...(sale.status !== 'Refunded'
                        ? [
                            {
                              id: 'refund',
                              label: isAr ? 'استرجاع' : 'Avoir / Remb.',
                              icon: <RotateCcw size={16} />,
                              onClick: () => {
                                setInspectingSale(null);
                                setSelectedSaleForRefund(sale);
                              },
                            },
                          ]
                        : []),
                    ]}
                  />
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={isAr ? 'معاينة وطباعة وصل 80 مم' : 'Imprimer Ticket Thermique 80mm'}
                    icon={<Printer size={15} />}
                    onClick={() => setSelectedSaleForReceipt(sale)}
                  />
                </InspectorSection>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <InspectorSection index={0}>
                <InspectorBigStat
                  value={formatMoney(sale.totalAmount)}
                  tone={sale.status === 'Refunded' ? 'danger' : 'accent'}
                  caption={`${sale.paymentMethod} · ${sale.items.length} article(s)`}
                />
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'معلومات الدفع' : 'Détails Transaction'}>
                <InspectorCard>
                  <InspectorKeyValue label={isAr ? 'الزبون' : 'Client'} value={sale.memberName || t('shop_receipt_walkin')} mono={false} />
                  {sale.customerPhone && (
                    <InspectorKeyValue label={isAr ? 'الهاتف' : 'Téléphone'} value={sale.customerPhone} copyText={sale.customerPhone} />
                  )}
                  <InspectorKeyValue label={isAr ? 'أمين الصندوق' : 'Caissier'} value={sale.cashierName || currentUser?.fullName || 'Caisse'} mono={false} />
                  <InspectorKeyValue label={isAr ? 'طريقة الدفع' : 'Règlement'} value={sale.paymentMethod} />
                  <InspectorKeyValue label={isAr ? 'المبلغ الإجمالي' : 'Total Net'} value={formatMoney(sale.totalAmount)} tone="accent" isLast />
                </InspectorCard>
              </InspectorSection>
              <InspectorSection index={2}>
                <InspectorWideButton
                  label={isAr ? 'طباعة الوصل' : 'Imprimer Ticket 80mm'}
                  icon={<Printer size={15} />}
                  onClick={() => setSelectedSaleForReceipt(sale)}
                />
              </InspectorSection>
            </div>
          );
        }}
      />

      <KineticSlideOverInspector<ParkedOrder>
        isOpen={inspectingParked !== null}
        item={inspectingParked}
        allItems={sortedParkedOrders}
        keyExtractor={(po) => po.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectingParked?.referenceName || ''}
        subtitle={inspectingParked ? new Date(inspectingParked.createdAt).toLocaleString() : undefined}
        avatarText={inspectingParked ? getInitials2(inspectingParked.referenceName) : 'PK'}
        avatarColor="#d4522f"
        branchName={inspectingParked ? resolveRecordBranch(inspectingParked, branchesById, currentBranch, language).name : undefined}
        statusLabel={isAr ? 'في الانتظار' : 'En pause'}
        statusClassName={MEMBER_PILL_WARN}
        tabs={[
          { id: 'overview', label: isAr ? 'الملخص' : isEn ? 'Overview' : 'Résumé' },
          { id: 'items', label: isAr ? 'المحتويات' : isEn ? 'Items' : 'Articles' },
          { id: 'actions', label: isAr ? 'إجراءات' : isEn ? 'Actions' : 'Actions' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onClose={() => setInspectingParked(null)}
        onSelectItem={(po) => {
          setInspectorTab('overview');
          setInspectingParked(po);
        }}
        holdToDelete
        deleteLabel={isAr ? 'حذف' : 'Supprimer'}
        onDelete={(po) => {
          deleteParkedOrder(po.id);
          setInspectingParked(null);
        }}
        renderBody={(po, tab) => {
          if (tab === 'items') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title={`${po.items.length} article(s)`}>
                  <InspectorCard>
                    {po.items.map((it, idx) => (
                      <InspectorListItem
                        key={idx}
                        title={it.productName}
                        subtitle={`${it.quantity} × ${formatMoney(it.unitPrice)}`}
                        metaRight={formatMoney(it.totalPrice)}
                        isLast={idx === po.items.length - 1}
                      />
                    ))}
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
                        id: 'resume',
                        label: isAr ? 'استئناف' : 'Reprendre',
                        icon: <PlayCircle size={16} />,
                        primary: true,
                        onClick: () => {
                          resumeParkedOrder(po.id);
                          setInspectingParked(null);
                          setScreen('shop');
                        },
                      },
                    ]}
                  />
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={isAr ? 'استئناف في نقطة البيع' : 'Reprendre en Caisse'}
                    icon={<PlayCircle size={15} />}
                    onClick={() => {
                      resumeParkedOrder(po.id);
                      setInspectingParked(null);
                      setScreen('shop');
                    }}
                  />
                </InspectorSection>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <InspectorSection index={0}>
                <InspectorBigStat
                  value={formatMoney(po.totalAmount)}
                  tone="accent"
                  caption={`${po.items.length} article(s) en attente`}
                />
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'تفاصيل التذكرة' : 'Informations'}>
                <InspectorCard>
                  <InspectorKeyValue label={isAr ? 'المرجع' : 'Référence'} value={po.referenceName} mono={false} />
                  <InspectorKeyValue label={isAr ? 'التاريخ' : 'Créée le'} value={new Date(po.createdAt).toLocaleString()} isLast={!po.notes} />
                  {po.notes && <InspectorKeyValue label="Notes" value={po.notes} mono={false} isLast />}
                </InspectorCard>
              </InspectorSection>
              <InspectorSection index={2}>
                <InspectorWideButton
                  label={isAr ? 'استئناف في نقطة البيع' : 'Reprendre en Caisse'}
                  icon={<PlayCircle size={15} />}
                  onClick={() => {
                    resumeParkedOrder(po.id);
                    setInspectingParked(null);
                    setScreen('shop');
                  }}
                />
              </InspectorSection>
            </div>
          );
        }}
      />

      <Modal
        isOpen={Boolean(selectedSaleForReceipt)}
        onClose={() => setSelectedSaleForReceipt(null)}
        title={isAr ? 'معاينة وصل الدفع 80 مم' : 'Ticket de Caisse 80mm'}
        subtitle={
          retainedSaleForReceipt
            ? `Ticket #${retainedSaleForReceipt.id.slice(-8).toUpperCase()}`
            : ''
        }
      >
        {retainedSaleForReceipt && (
          <div className="space-y-4" dir="ltr">
            <div className="sq-elev-card mx-auto max-w-[340px]">
              <div
                id="pos-orders-thermal-receipt"
                data-sq="card"
                data-sq-border="solid"
                className="bg-white text-black p-4 [--sq-stroke:rgba(23,19,15,0.12)] tabular-nums t-cap leading-relaxed"
              >
              <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-black/[0.22]">
                <div className="t-label font-semibold">
                  {receiptConfig.headerTitle || currentBranch.name}
                </div>
                {receiptConfig.subHeader && (
                  <div className="t-cap text-black/75">{receiptConfig.subHeader}</div>
                )}
                <div className="t-cap text-black/55">
                  {receiptConfig.address || currentBranch.address || '8 Rue Didouche Mourad, Alger'}
                </div>
                {receiptConfig.phone && (
                  <div className="t-cap text-black/55">Tel: {receiptConfig.phone}</div>
                )}
                {receiptConfig.taxId && (
                  <div className="t-small font-semibold text-black/75">NIF/RC: {receiptConfig.taxId}</div>
                )}
              </div>

              <div className="py-2 t-cap border-b border-dashed border-black/[0.22] space-y-0.5">
                <div className="flex justify-between">
                  <span>TICKET: #{retainedSaleForReceipt.id.slice(-8).toUpperCase()}</span>
                  <span>{new Date(retainedSaleForReceipt.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CAISSIER: {retainedSaleForReceipt.cashierName || currentUser?.fullName || 'Caissier'}</span>
                  <span>{new Date(retainedSaleForReceipt.createdAt).toLocaleTimeString()}</span>
                </div>
                {retainedSaleForReceipt.memberName && (
                  <div className="flex justify-between font-semibold">
                    <span>CLIENT:</span>
                    <span>{retainedSaleForReceipt.memberName}</span>
                  </div>
                )}
              </div>

              <div className="py-2 space-y-1 border-b border-dashed border-black/[0.22] t-cap">
                {retainedSaleForReceipt.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.productName}</span>
                    <span className="font-semibold">{formatMoney(it.totalPrice)}</span>
                  </div>
                ))}
              </div>

              <div className="py-2 space-y-1 border-b border-dashed border-black/[0.22]">
                <div className="flex justify-between t-label font-semibold pt-1">
                  <span>TOTAL PAYÉ</span>
                  <span>{formatMoney(retainedSaleForReceipt.totalAmount)}</span>
                </div>
                <div className="flex justify-between t-cap text-black/75 pt-0.5">
                  <span>MODE DE PAIEMENT :</span>
                  <span className="font-semibold">{retainedSaleForReceipt.paymentMethod}</span>
                </div>
              </div>

              <div className="pt-2 text-center space-y-1">
                {receiptConfig.showBarcode && (
                  <div className="w-36 h-6 mx-auto bg-neutral-900 text-white t-cap flex items-center justify-center">
                    |||| || ||||| || |||
                  </div>
                )}
                <div className="t-small font-semibold">
                  {receiptConfig.footerMessage || 'Merci pour votre visite !'}
                </div>
              </div>
            </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 h-10 px-4 t-small font-semibold text-white bg-[var(--brand-fill,#C9461F)] rounded-full cursor-pointer hover:opacity-90 flex items-center justify-center gap-2"
              >
                <Printer size={14} />
                <span>{isAr ? 'طباعة الوصل' : 'Imprimer Ticket 80mm'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSaleForReceipt(null)}
                className="h-10 px-4 t-small font-semibold text-black/70 dark:text-white/75 rounded-full hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] cursor-pointer"
              >
                {t('action_cancel')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(selectedSaleForRefund)}
        onClose={() => setSelectedSaleForRefund(null)}
        title={isAr ? 'تأكيد استرجاع الوصل (Avoir)' : 'Confirmer le Remboursement (Avoir)'}
        subtitle={
          retainedSaleForRefund
            ? `Ticket #${retainedSaleForRefund.id.slice(-8).toUpperCase()} · ${formatMoney(retainedSaleForRefund.totalAmount)}`
            : ''
        }
      >
        <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <p className="t-cap text-black/55 dark:text-white/55">
            {isAr
              ? 'سيتم إعادة الأصناف تلقائياً إلى المخزون وتسجيل حركة إرجاع في سجل التدقيق.'
              : 'Les articles seront automatiquement réintégrés dans l’inventaire physique avec suivi complet.'}
          </p>

          <LabelInput
            label={isAr ? 'سبب الإرجاع / الملاحظة' : 'Motif de retour / avoir'}
            value={refundReason}
            onChange={(val) => setRefundReason(typeof val === 'string' ? val : val.target?.value || '')}
            placeholder="Ex: Erreur de saisie, produit défectueux..."
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <AtriumButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSaleForRefund(null)}
            >
              {t('action_cancel')}
            </AtriumButton>
            <AtriumButton
              type="button"
              variant="danger"
              size="sm"
              onClick={handleConfirmRefund}
            >
              {isAr ? 'تأكيد الاسترجاع' : 'Valider le Remboursement'}
            </AtriumButton>
          </div>
        </div>
      </Modal>
    </div>
  );
};
