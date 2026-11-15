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
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
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
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

type SalesStatusFilter = 'all' | 'completed' | 'refunded';

export const PosOrdersView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const {
    sales,
    parkedOrders,
    currentBranch,
    branches,
    setScreen,
    resumeParkedOrder,
    deleteParkedOrder,
    refundSale,
    batchDeleteSales,
    receiptConfig,
    currentUser,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

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
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [selectedSaleForRefund, setSelectedSaleForRefund] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState('Demande Client / Avoir');

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
            <span className="font-mono font-bold text-xs text-black dark:text-white block">
              #{s.id.slice(-6).toUpperCase()}
            </span>
            <span className="text-[10px] text-black/55 dark:text-white/55 font-mono block">
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
            <div className="font-bold text-xs text-black dark:text-white truncate">
              {s.memberName || t('shop_receipt_walkin')}
            </div>
            {s.customerPhone && (
              <div className="text-[10px] text-black/55 dark:text-white/55 font-mono truncate">
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
          <div className="flex items-center gap-1.5 flex-wrap">
            {s.items.slice(0, 2).map((it, idx) => (
              <span
                key={idx}
                className="text-[11px] text-black/70 dark:text-white/75 font-medium bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded"
              >
                {it.quantity}x {it.productName.split('(')[0].trim()}
              </span>
            ))}
            {s.items.length > 2 && (
              <span className="text-[10px] font-bold text-black/55 dark:text-white/55">
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
            <div className="flex items-center gap-1.5 text-xs">
              {isCash ? (
                <Banknote size={14} className="text-emerald-500 shrink-0" />
              ) : isCard ? (
                <CreditCard size={14} className="text-blue-500 shrink-0" />
              ) : (
                <Coins size={14} className="text-[#d4522f] shrink-0" />
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
          <span className="font-mono font-bold text-xs text-black dark:text-white tabular-nums">
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
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
          <span className="text-[12px] font-medium text-black/75 dark:text-white/80 truncate block">
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
              className="h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-semibold text-black/70 dark:text-white flex items-center gap-1 cursor-pointer transition-colors"
              title="Ticket Thermique 80mm"
            >
              <Printer size={13} className="text-[#d4522f]" />
              <span>{isAr ? 'وصل' : 'Reçu'}</span>
            </button>
            {s.status !== 'Refunded' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedSaleForRefund(s);
                }}
                className="h-8 px-2 rounded-lg text-black/55 dark:text-white/55 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
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
            <span className="font-bold text-xs text-black dark:text-white block">
              {po.referenceName}
            </span>
            <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">
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
          <div className="flex items-center gap-1.5 flex-wrap">
            {po.items.slice(0, 3).map((it, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] font-medium text-black/70 dark:text-white/75"
              >
                {it.quantity}x {it.productName}
              </span>
            ))}
            {po.items.length > 3 && (
              <span className="text-[10px] font-bold text-black/55 dark:text-white/55">
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
          <span className="font-mono font-bold text-xs text-[#d4522f] tabular-nums">
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
          <span className="text-[12px] font-medium text-black/75 dark:text-white/80 truncate block">
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
              className="h-8 px-3 rounded-xl bg-[#d4522f] text-white text-xs font-bold flex items-center gap-1 hover:opacity-90 cursor-pointer shadow-xs"
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
              className="h-8 px-2 rounded-xl text-black/55 dark:text-white/55 hover:text-rose-500 cursor-pointer"
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
    showToast({
      type: 'warning',
      title: isAr ? 'تم استرجاع الوصل بنجاح' : 'Vente Remboursée (Avoir)',
      message: `Vente #${selectedSaleForRefund.id.slice(-6).toUpperCase()} remboursée. Motif: ${refundReason}`,
      category: 'pos_inventory',
    });
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
            font-size: 11px !important;
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
            data={sortedSales}
            columns={salesColumns}
            keyExtractor={(s) => s.id}
            viewMode={viewMode}
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
              setInspectingSale(s);
            }}
            onViewDetails={(s, opener) => {
              setDrawerOpenerEl(opener || null);
              setInspectingSale(s);
            }}
            onDelete={(s) => {
              batchDeleteSales([s.id]);
              if (inspectingSale?.id === s.id) setInspectingSale(null);
            }}
            renderCard={(s) => {
              const isRefunded = s.status === 'Refunded';
              return (
                <div className="flex flex-col justify-between h-full space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="font-mono font-bold text-xs text-black dark:text-white block">
                          #{s.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">
                          {new Date(s.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isRefunded ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {isRefunded ? 'Remboursé' : 'Encaissé'}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-black dark:text-white mb-1">
                      {s.memberName || 'Client de Passage'}
                    </div>
                    <div className="text-xs bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-xl space-y-0.5 text-black/70 dark:text-white/75">
                      {s.items.slice(0, 3).map((it, idx) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span>{it.quantity}x {it.productName}</span>
                          <span className="font-mono">{formatMoney(it.totalPrice)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <span className="font-mono font-black text-sm text-[#d4522f] tabular-nums">
                      {formatMoney(s.totalAmount)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSaleForReceipt(s);
                      }}
                      className="h-7 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Printer size={12} className="text-[#d4522f]" />
                      <span>Reçu</span>
                    </button>
                  </div>
                </div>
              );
            }}
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
              showToast({
                type: 'info',
                title: 'Tickets archivés',
                message: `${ids.size} tickets retirés.`,
              });
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
            data={sortedParkedOrders}
            columns={parkedColumns}
            keyExtractor={(po) => po.id}
            viewMode={viewMode}
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
              setInspectingParked(po);
            }}
            renderCard={(po) => (
              <div className="p-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-black dark:text-white">{po.referenceName}</span>
                  <span className="font-mono font-bold text-xs text-[#d4522f]">{formatMoney(po.totalAmount)}</span>
                </div>
                <div className="text-[11px] text-black/55 dark:text-white/55">
                  {po.items.length} article(s) · {new Date(po.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
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
              ids.forEach((id) => deleteParkedOrder(id));
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
        branchName={inspectingSale ? resolveRecordBranch(inspectingSale, branchesById, currentBranch, language).name : undefined}
        statusLabel={inspectingSale?.status === 'Refunded' ? 'Remboursé' : 'Encaissé'}
        statusClassName={
          inspectingSale?.status === 'Refunded'
            ? 'bg-rose-50 text-rose-700 border border-rose-200'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }
        onClose={() => setInspectingSale(null)}
        onSelectItem={(s) => setInspectingSale(s)}
        holdToDelete
        deleteLabel={isAr ? 'أرشفة' : 'Archiver'}
        onDelete={(s) => {
          batchDeleteSales([s.id]);
          setInspectingSale(null);
        }}
        renderBody={(sale) => (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] grid grid-cols-2 gap-3">
              <div>
                <span className="text-black/60 dark:text-white/65 block text-[11px]">Client</span>
                <span className="font-bold text-black dark:text-white">{sale.memberName || t('shop_receipt_walkin')}</span>
              </div>
              <div>
                <span className="text-black/60 dark:text-white/65 block text-[11px]">Caissier</span>
                <span className="font-bold text-black dark:text-white">{sale.cashierName || currentUser?.fullName || 'Caisse'}</span>
              </div>
              <div>
                <span className="text-black/60 dark:text-white/65 block text-[11px]">Mode de règlement</span>
                <span className="font-bold text-black dark:text-white">{sale.paymentMethod}</span>
              </div>
              <div>
                <span className="text-black/60 dark:text-white/65 block text-[11px]">Montant Payé</span>
                <span className="font-mono font-black text-[#d4522f]">{formatMoney(sale.totalAmount)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/65">
                Détail des Articles ({sale.items.length})
              </div>
              <div className="divide-y divide-[#E6DED6] dark:divide-[#3A3734] rounded-2xl border border-[#E6DED6] dark:border-[#3A3734] bg-white dark:bg-[#1E1C1A] px-3.5">
                {sale.items.map((it, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-black dark:text-white">{it.productName}</span>
                      <span className="text-[11px] text-black/55 dark:text-white/55 block font-mono">
                        {it.quantity} × {formatMoney(it.unitPrice)}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-black dark:text-white">{formatMoney(it.totalPrice)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <AtriumButton
                type="button"
                variant="primary"
                icon={<Printer size={14} />}
                className="w-full justify-center"
                onClick={() => setSelectedSaleForReceipt(sale)}
              >
                {isAr ? 'معاينة وطباعة وصل 80 مم' : 'Imprimer Ticket 80mm'}
              </AtriumButton>
              {sale.status !== 'Refunded' && (
                <AtriumButton
                  type="button"
                  variant="secondary"
                  icon={<RotateCcw size={14} />}
                  className="w-full justify-center"
                  onClick={() => {
                    setInspectingSale(null);
                    setSelectedSaleForRefund(sale);
                  }}
                >
                  {isAr ? 'استرجاع الوصل (Avoir)' : 'Émettre un Avoir / Rembourser'}
                </AtriumButton>
              )}
            </div>
          </div>
        )}
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
        branchName={inspectingParked ? resolveRecordBranch(inspectingParked, branchesById, currentBranch, language).name : undefined}
        statusLabel="En pause"
        statusClassName="bg-amber-50 text-amber-700 border border-amber-200"
        onClose={() => setInspectingParked(null)}
        onSelectItem={(po) => setInspectingParked(po)}
        holdToDelete
        deleteLabel={isAr ? 'حذف' : 'Supprimer'}
        onDelete={(po) => {
          deleteParkedOrder(po.id);
          setInspectingParked(null);
        }}
        renderBody={(po) => (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex items-center justify-between">
              <span className="font-semibold text-black/70 dark:text-white/75">Total panier en attente</span>
              <span className="font-mono font-black text-base text-[#d4522f]">{formatMoney(po.totalAmount)}</span>
            </div>
            <div className="space-y-1.5">
              {po.items.map((it, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-[#E6DED6] dark:border-[#3A3734] flex justify-between">
                  <span>{it.quantity}× {it.productName}</span>
                  <span className="font-mono font-bold">{formatMoney(it.totalPrice)}</span>
                </div>
              ))}
            </div>
            <AtriumButton
              type="button"
              variant="primary"
              icon={<PlayCircle size={14} />}
              className="w-full justify-center"
              onClick={() => {
                resumeParkedOrder(po.id);
                setInspectingParked(null);
                setScreen('shop');
              }}
            >
              {isAr ? 'استئناف في نقطة البيع' : 'Reprendre en Caisse'}
            </AtriumButton>
          </div>
        )}
      />

      {selectedSaleForReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSaleForReceipt(null)}
          title={isAr ? 'معاينة وصل الدفع 80 مم' : 'Ticket de Caisse 80mm'}
          subtitle={`Ticket #${selectedSaleForReceipt.id.slice(-8).toUpperCase()}`}
        >
          <div className="space-y-4" dir="ltr">
            <div
              id="pos-orders-thermal-receipt"
              className="mx-auto max-w-[340px] bg-white text-black p-4 rounded-xl border border-neutral-300 font-mono text-[11px] leading-relaxed shadow-xs"
            >
              <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-neutral-400">
                <div className="text-sm font-black uppercase tracking-wider">
                  {receiptConfig.headerTitle || currentBranch.name}
                </div>
                {receiptConfig.subHeader && (
                  <div className="text-[10px] text-black/75">{receiptConfig.subHeader}</div>
                )}
                <div className="text-[10px] text-black/55">
                  {receiptConfig.address || currentBranch.address || '8 Rue Didouche Mourad, Alger'}
                </div>
                {receiptConfig.phone && (
                  <div className="text-[10px] text-black/55">Tel: {receiptConfig.phone}</div>
                )}
                {receiptConfig.taxId && (
                  <div className="text-[10px] font-bold text-black/75">NIF/RC: {receiptConfig.taxId}</div>
                )}
              </div>

              <div className="py-2 text-[10px] border-b border-dashed border-neutral-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>TICKET: #{selectedSaleForReceipt.id.slice(-8).toUpperCase()}</span>
                  <span>{new Date(selectedSaleForReceipt.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CAISSIER: {selectedSaleForReceipt.cashierName || currentUser?.fullName || 'Caissier'}</span>
                  <span>{new Date(selectedSaleForReceipt.createdAt).toLocaleTimeString()}</span>
                </div>
                {selectedSaleForReceipt.memberName && (
                  <div className="flex justify-between font-bold">
                    <span>CLIENT:</span>
                    <span>{selectedSaleForReceipt.memberName}</span>
                  </div>
                )}
              </div>

              <div className="py-2 space-y-1 border-b border-dashed border-neutral-400 text-[11px]">
                {selectedSaleForReceipt.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.productName}</span>
                    <span className="font-bold">{formatMoney(it.totalPrice)}</span>
                  </div>
                ))}
              </div>

              <div className="py-2 space-y-1 border-b border-dashed border-neutral-400">
                <div className="flex justify-between text-sm font-black pt-1">
                  <span>TOTAL PAYÉ</span>
                  <span>{formatMoney(selectedSaleForReceipt.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-black/75 pt-0.5">
                  <span>MODE DE PAIEMENT :</span>
                  <span className="font-bold">{selectedSaleForReceipt.paymentMethod}</span>
                </div>
              </div>

              <div className="pt-2 text-center space-y-1">
                {receiptConfig.showBarcode && (
                  <div className="w-36 h-6 mx-auto bg-neutral-900 text-white text-[10px] flex items-center justify-center tracking-widest">
                    |||| || ||||| || |||
                  </div>
                )}
                <div className="text-[10px] font-bold">
                  {receiptConfig.footerMessage || 'Merci pour votre visite !'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 h-10 px-4 text-xs font-bold text-white bg-[#d4522f] rounded-full cursor-pointer hover:opacity-90 flex items-center justify-center gap-2"
              >
                <Printer size={14} />
                <span>{isAr ? 'طباعة الوصل' : 'Imprimer Ticket 80mm'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSaleForReceipt(null)}
                className="h-10 px-4 text-xs font-semibold text-black/70 dark:text-white/75 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                {t('action_cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {selectedSaleForRefund && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSaleForRefund(null)}
          title={isAr ? 'تأكيد استرجاع الوصل (Avoir)' : 'Confirmer le Remboursement (Avoir)'}
          subtitle={`Ticket #${selectedSaleForRefund.id.slice(-8).toUpperCase()} · ${formatMoney(selectedSaleForRefund.totalAmount)}`}
        >
          <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
            <p className="text-xs text-black/55 dark:text-white/55">
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
      )}
    </div>
  );
};
