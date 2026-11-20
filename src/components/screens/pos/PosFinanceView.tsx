import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Wallet,
  Banknote,
  CreditCard,
  Coins,
  Printer,
  Plus,
  Trash2,
  Eye,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { Modal } from '../../ui/Modal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonFinanceAudit } from '../../ui/skeleton/StructuralSkeletons';
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
  return (name || 'DP').slice(0, 2).toUpperCase();
};

const MEMBER_PILL_DANGER =
  'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]';

interface PosExpense {
  id: string;
  facilityId?: string;
  reference: string;
  payee: string;
  category: 'Supplies' | 'Supplier' | 'Maintenance' | 'Transport' | 'StaffMeal' | 'Other';
  amount: number;
  paymentMethod: 'Cash' | 'Card' | 'BaridiMob';
  paidBy: string;
  notes?: string;
  createdAt: string;
}

export const PosFinanceView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const {
    sales,
    currentBranch,
    branches,
    currentUser,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [expenses, setExpenses] = useState<PosExpense[]>([]);
  const [openingFloat, setOpeningFloat] = useState<number>(15000);
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [isZReportOpen, setIsZReportOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expPayee, setExpPayee] = useState('');
  const [expCategory, setExpCategory] = useState<PosExpense['category']>('Supplies');
  const [expAmount, setExpAmount] = useState<number>(1500);
  const [expMethod, setExpMethod] = useState<'Cash' | 'Card' | 'BaridiMob'>('Cash');
  const [expNotes, setExpNotes] = useState('');

  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedExpenseIds, setPinnedExpenseIds] = useState<Set<string>>(() => new Set<string>());
  const [inspectingExpense, setInspectingExpense] = useState<PosExpense | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('overview');
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchSales = useMemo(
    () =>
      sales.filter(
        (s) => s.facilityId === currentBranch.id || s.id.startsWith('sale_pos_')
      ),
    [sales, currentBranch.id]
  );

  const todaySales = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return branchSales.filter((s) => s.createdAt.startsWith(today) && s.status !== 'Refunded');
  }, [branchSales]);

  const financeTotals = useMemo(() => {
    let cashSales = 0;
    let cardSales = 0;
    let baridiMobSales = 0;
    let totalGrossSales = 0;

    todaySales.forEach((s) => {
      totalGrossSales += s.totalAmount;
      if (s.paymentMethod === 'Cash') cashSales += s.totalAmount;
      else if (s.paymentMethod === 'Card') cardSales += s.totalAmount;
      else if (s.paymentMethod === 'BankTransfer') baridiMobSales += s.totalAmount;
      else if (s.paymentMethod === 'Split' && s.payments) {
        s.payments.forEach((p) => {
          if (p.method === 'Cash') cashSales += p.amount;
          else if (p.method === 'Card') cardSales += p.amount;
          else if (p.method === 'BankTransfer') baridiMobSales += p.amount;
        });
      }
    });

    const totalCashPayouts = expenses
      .filter((e) => e.paymentMethod === 'Cash')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalAllExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const expectedCashInDrawer = openingFloat + cashSales - totalCashPayouts;
    const actualCounted = parseFloat(actualCashInput) || 0;
    const cashVariance = actualCashInput !== '' ? actualCounted - expectedCashInDrawer : 0;

    const branchCounts = new Map<string, number>();
    expenses.forEach((e) => {
      const bName = resolveRecordBranch(e, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });

    return {
      cashSales,
      cardSales,
      baridiMobSales,
      totalGrossSales,
      totalCashPayouts,
      totalAllExpenses,
      expectedCashInDrawer,
      actualCounted,
      cashVariance,
      hasCounted: actualCashInput !== '',
      branchOptionsWithCounts: Array.from(branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    };
  }, [todaySales, expenses, openingFloat, actualCashInput, branchesById, currentBranch, language]);

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return expenses.filter((e) => {
      if (categoryFilter !== 'All' && e.category !== categoryFilter) return false;
      if (methodFilter !== 'all' && e.paymentMethod !== methodFilter) return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(e, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const bName = resolveRecordBranch(e, branchesById, currentBranch, language).name.toLowerCase();
        return (
          e.reference.toLowerCase().includes(q) ||
          e.payee.toLowerCase().includes(q) ||
          (e.notes && e.notes.toLowerCase().includes(q)) ||
          e.paidBy.toLowerCase().includes(q) ||
          bName.includes(q)
        );
      }
      return true;
    });
  }, [expenses, categoryFilter, methodFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedExpenses = useMemo(() => {
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filteredExpenses].sort((a, b) => {
      const aPinned = pinnedExpenseIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedExpenseIds.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      if (sortBy === 'ref') return a.reference.localeCompare(b.reference) * sign;
      if (sortBy === 'payee') return a.payee.localeCompare(b.payee) * sign;
      if (sortBy === 'category') return a.category.localeCompare(b.category) * sign;
      if (sortBy === 'amount') return (a.amount - b.amount) * sign;
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * sign;
      }
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * sign;
    });
  }, [filteredExpenses, pinnedExpenseIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expPayee.trim() || expAmount <= 0) return;

    const newExp: PosExpense = {
      id: `exp_pos_${Date.now()}`,
      facilityId: currentBranch.id,
      reference: `DEC-${(expenses.length + 1).toString().padStart(3, '0')}`,
      payee: expPayee.trim(),
      category: expCategory,
      amount: expAmount,
      paymentMethod: expMethod,
      paidBy: currentUser?.fullName || 'Cashier',
      notes: expNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setExpenses([newExp, ...expenses]);
    setExpPayee('');
    setExpAmount(1500);
    setExpNotes('');
    setIsExpenseModalOpen(false);

    showToast({
      type: 'info',
      title: isAr ? 'تم تسجيل خروج نقدي من الصندوق' : 'Sortie de Caisse Enregistrée',
      message: `${newExp.payee} · ${formatMoney(newExp.amount)} (${newExp.category})`,
      category: 'pos_inventory',
    });
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (inspectingExpense?.id === id) setInspectingExpense(null);
  };

  const handleResetFilters = useCallback(() => {
    setCategoryFilter('All');
    setMethodFilter('all');
    setBranchFilter('All');
    setSearchQuery('');
    setIsFilterModalOpen(false);
  }, []);

  const hasActiveAdvancedFilters = categoryFilter !== 'All' || branchFilter !== 'All';
  const activeFiltersCount = (categoryFilter !== 'All' ? 1 : 0) + (branchFilter !== 'All' ? 1 : 0);

  const handleExportExpensesCSV = useCallback(() => {
    const headers = [
      'Ref #',
      'Date & Time',
      'Payee / Supplier',
      'Category',
      'Payment Method',
      'Handled By',
      'Amount (DA)',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
      'Notes',
    ];
    const rows = sortedExpenses.map((e) => [
      e.reference,
      new Date(e.createdAt).toLocaleString(),
      e.payee,
      e.category,
      e.paymentMethod,
      e.paidBy,
      e.amount,
      resolveRecordBranch(e, branchesById, currentBranch, language).name,
      e.notes || '',
    ]);
    downloadCsvSafe(`atrium-pos-expenses-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [sortedExpenses, branchesById, currentBranch, language, isAr, isEn]);

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: expenses.length },
      { value: 'Cash', label: isAr ? 'نقداً' : 'Espèces' },
      { value: 'Card', label: isAr ? 'بطاقة' : 'Carte' },
      { value: 'BaridiMob', label: 'BaridiMob' },
    ],
    [isAr, isEn, expenses.length]
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
          { value: 'All', label: isAr ? 'كل الفروع' : isEn ? 'All Branches' : 'Toutes les branches', count: expenses.length },
          ...financeTotals.branchOptionsWithCounts,
        ],
      },
      {
        id: 'category',
        label: isAr ? 'التصنيف' : isEn ? 'Category' : 'Catégorie de charge',
        value: categoryFilter,
        onChange: setCategoryFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Toutes' },
          { value: 'Supplies', label: 'Fournitures' },
          { value: 'Supplier', label: 'Fournisseurs' },
          { value: 'Maintenance', label: 'Maintenance' },
          { value: 'Transport', label: 'Transport' },
          { value: 'StaffMeal', label: 'Collation' },
          { value: 'Other', label: 'Autre' },
        ],
      },
      {
        id: 'method',
        label: isAr ? 'طريقة السحب' : isEn ? 'Payment Method' : 'Mode de règlement',
        value: methodFilter,
        onChange: setMethodFilter,
        kind: 'segmented',
        options: statusOptions,
      },
    ],
    [isAr, isEn, branchFilter, expenses.length, financeTotals.branchOptionsWithCounts, categoryFilter, methodFilter, statusOptions]
  );

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') chips.push({ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') });
    if (categoryFilter !== 'All') chips.push({ key: 'category', label: categoryFilter, onRemove: () => setCategoryFilter('All') });
    return chips;
  }, [branchFilter, categoryFilter]);

  const expenseColumns: ColumnDefinition<PosExpense>[] = useMemo(
    () => [
      {
        key: 'ref',
        header: isAr ? 'المرجع' : 'Réf',
        width: '100px',
        sortable: true,
        renderCell: (e) => (
          <span className="font-mono font-bold text-xs text-black dark:text-white">
            {e.reference}
          </span>
        ),
      },
      {
        key: 'payee',
        header: isAr ? 'المستفيد / المورد' : 'Bénéficiaire / Motif',
        minWidth: '170px',
        sortable: true,
        renderCell: (e) => (
          <div>
            <div className="font-bold text-xs text-black dark:text-white truncate">{e.payee}</div>
            {e.notes && (
              <div className="text-[10px] text-black/55 dark:text-white/55 truncate">{e.notes}</div>
            )}
          </div>
        ),
      },
      {
        key: 'category',
        header: isAr ? 'التصنيف' : 'Catégorie',
        width: '120px',
        sortable: true,
        renderCell: (e) => (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-[var(--r-check,6px)] bg-neutral-100 dark:bg-neutral-800 text-black/70 dark:text-white/75">
            {e.category}
          </span>
        ),
      },
      {
        key: 'method',
        header: isAr ? 'الوسيلة' : 'Mode',
        width: '105px',
        renderCell: (e) => (
          <span className="text-xs text-black/70 dark:text-white/75">
            {e.paymentMethod === 'Cash' ? 'Espèces' : e.paymentMethod}
          </span>
        ),
      },
      {
        key: 'amount',
        header: isAr ? 'المبلغ' : 'Montant',
        width: '125px',
        sortable: true,
        renderCell: (e) => (
          <span className="font-mono font-black text-sm text-red-600 dark:text-red-400 tabular-nums">
            -{formatMoney(e.amount)}
          </span>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        width: '120px',
        sortable: true,
        renderCell: (e) => (
          <span className="text-xs font-medium text-black/75 dark:text-white/80 truncate block">
            {resolveRecordBranch(e, branchesById, currentBranch, language).name}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '60px',
        renderCell: (e) => (
          <button
            type="button"
            onClick={(ev) => {
              ev.stopPropagation();
              handleDeleteExpense(e.id);
            }}
            className="text-black/55 dark:text-white/55 hover:text-red-500 cursor-pointer p-1"
            title="Delete entry"
          >
            <Trash2 size={14} />
          </button>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: sales.length > 0,
  });

  if (showSkeleton && (sales.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonFinanceAudit
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <ScreenHeaderBar
        icon={<Wallet size={22} />}
        title={isAr ? 'المالية' : isEn ? 'Finance' : 'Finances'}
        secondaryActions={
          <AtriumButton
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setIsZReportOpen(true)}
            icon={<Printer size={15} className="text-[#d4522f]" />}
          >
            {isAr ? 'إصدار تقرير Z اليومي' : 'Éditer Rapport Z'}
          </AtriumButton>
        }
        primaryAction={{
          label: isAr ? 'تسجيل مصاريف الصندوق' : isEn ? 'Cash Payout' : 'Sortie de Caisse',
          icon: <Plus size={15} />,
          onClick: () => setIsExpenseModalOpen(true),
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'لوحة مؤشرات الخزينة والتسوية النقدية' : isEn ? 'Cash Drawer & Variance' : 'Indicateurs de Caisse & Contrôle des Écarts'}
        language={language}
        primaryCard={{
          label: isAr ? 'إجمالي المبيعات اليومية' : isEn ? 'Gross Sales Today' : 'Ventes Brutes Jour',
          badgeText: `${todaySales.length} tickets`,
          count: financeTotals.totalGrossSales,
          formatValue: (n) => formatMoney(n),
          tone: 'emerald',
        }}
        secondaryCard={{
          label: isAr ? 'سحوبات ومصاريف' : isEn ? 'Cash Payouts' : 'Sorties de Caisse',
          badgeText: 'dépenses',
          count: financeTotals.totalCashPayouts,
          formatValue: (n) => formatMoney(n),
          tone: 'terracotta',
          isActive: methodFilter === 'Cash',
          onToggle: () => setMethodFilter((p) => (p === 'Cash' ? 'all' : 'Cash')),
        }}
        darkCard={{
          label: isAr ? 'الرصيد النظري في الدرج' : isEn ? 'Expected Drawer Cash' : 'Solde Théorique Attendu',
          badgePrefix: '',
          badgeCount: Math.round(financeTotals.cashVariance),
          badgeSuffix: financeTotals.hasCounted ? 'DA écart' : 'DA fond',
          valuePrefix: '',
          valueCount: financeTotals.expectedCashInDrawer,
          formatValue: (n) => formatMoney(n),
          caption: `${currentBranch?.name || 'Magasin'} · Fond ${formatMoney(openingFloat)}`,
        }}
      />

      {/* Drawer Equation + Live Cash Counting Bar */}
      <ScreenPod>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#E6DED6] dark:border-[#33302D]">
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <span className="text-black/60 dark:text-white/65">
              Fond <strong className="text-black dark:text-white">{formatMoney(openingFloat)}</strong>
            </span>
            <span>+</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              Espèces <strong>+{formatMoney(financeTotals.cashSales)}</strong>
            </span>
            <span>-</span>
            <span className="text-red-500">
              Sorties <strong>-{formatMoney(financeTotals.totalCashPayouts)}</strong>
            </span>
            <span>=</span>
            <span className="text-[#d4522f] font-black">
              {formatMoney(financeTotals.expectedCashInDrawer)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-black/65 dark:text-white/70">
              <span>{isAr ? 'الرصيد الافتتاحي:' : 'Fond initial:'}</span>
              <input
                type="number"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                className="w-24 h-8 px-2 text-xs font-mono font-bold rounded-[var(--r-ctl-sm,10px)] border border-[#E6DED6] dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white"
              />
            </label>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-black/65 dark:text-white/70">
              <span>{isAr ? 'المعدود فعلياً:' : 'Espèces comptées:'}</span>
              <input
                type="number"
                placeholder="DA réel"
                value={actualCashInput}
                onChange={(e) => setActualCashInput(e.target.value)}
                className="w-28 h-8 px-2 text-xs font-mono font-bold rounded-[var(--r-ctl-sm,10px)] border border-[#E6DED6] dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-4 bg-white dark:bg-neutral-800 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#404040] space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote size={16} className="text-emerald-500" />
                <span className="text-xs font-bold text-black/75 dark:text-white/80">
                  {isAr ? 'الدفع نقداً' : 'Règlement Espèces'}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-black/55 dark:text-white/55">
                {financeTotals.totalGrossSales > 0 ? `${Math.round((financeTotals.cashSales / financeTotals.totalGrossSales) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-xl font-black font-mono text-black dark:text-white tabular-nums">
              {formatMoney(financeTotals.cashSales)}
            </div>
          </div>

          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-4 bg-white dark:bg-neutral-800 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#404040] space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-blue-500" />
                <span className="text-xs font-bold text-black/75 dark:text-white/80">
                  CIB & Carte Edahabia
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-black/55 dark:text-white/55">
                {financeTotals.totalGrossSales > 0 ? `${Math.round((financeTotals.cardSales / financeTotals.totalGrossSales) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-xl font-black font-mono text-black dark:text-white tabular-nums">
              {formatMoney(financeTotals.cardSales)}
            </div>
          </div>

          <div
            data-sq="card"
            data-sq-border="solid"
            className="p-4 bg-white dark:bg-neutral-800 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#404040] space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-[#d4522f]" />
                <span className="text-xs font-bold text-black/75 dark:text-white/80">
                  BaridiMob & Virements
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-black/55 dark:text-white/55">
                {financeTotals.totalGrossSales > 0 ? `${Math.round((financeTotals.baridiMobSales / financeTotals.totalGrossSales) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-xl font-black font-mono text-black dark:text-white tabular-nums">
              {formatMoney(financeTotals.baridiMobSales)}
            </div>
          </div>
        </div>
      </ScreenPod>

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'سجل مصاريف وسحوبات الصندوق' : isEn ? 'Cash Payout Journal' : 'Journal des Sorties de Caisse'}
          liveRegionText={`${sortedExpenses.length} dépenses`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث في المصاريف أو الفرع...' : 'Rechercher bénéficiaire, réf, branche...'}
          statusOptions={statusOptions}
          statusValue={methodFilter}
          onStatusChange={setMethodFilter}
          hasActiveAdvancedFilters={hasActiveAdvancedFilters}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((p) => !p)}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          onExport={handleExportExpensesCSV}
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <UniversalDataCollection<PosExpense>
          items={sortedExpenses}
          keyExtractor={(e) => e.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode="list"
          hideToolbar
          openItemId={inspectingExpense?.id ?? null}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          columns={expenseColumns}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(col, dir) => {
            setSortBy(col);
            setSortDir(dir);
          }}
          onItemClick={(e, opener) => {
            setDrawerOpenerEl(opener || null);
            setInspectorTab('overview');
            setInspectingExpense(e);
          }}
          onViewDetails={(e, opener) => {
            setDrawerOpenerEl(opener || null);
            setInspectorTab('overview');
            setInspectingExpense(e);
          }}
          onDelete={(e) => handleDeleteExpense(e.id)}
          getRowMeta={(e): Partial<KineticRowData> => {
            const branchInfo = resolveRecordBranch(e, branchesById, currentBranch, language);
            return {
              title: e.payee,
              subline: `${e.reference} · ${new Date(e.createdAt).toLocaleString()}`,
              avatarText: getInitials2(e.payee),
              categoryLabel: e.category,
              statusLabel: e.paymentMethod === 'Cash' ? 'Espèces' : e.paymentMethod,
              statusVariant: 'warning',
              metricPrimary: `-${formatMoney(e.amount)}`,
              metricSecondary: e.paidBy,
              branchName: branchInfo.name,
              branchCode: branchInfo.code,
              isPinned: pinnedExpenseIds.has(e.id),
              detailCol1: {
                heading: isAr ? 'المستفيد والمرجع' : isEn ? 'Payee & Ref' : 'Bénéficiaire & Réf',
                primaryText: e.payee,
                secondaryText: `${e.reference} · ${e.category}`,
                tertiaryText: branchInfo.name,
              },
              detailCol2: {
                heading: isAr ? 'طريقة الدفع والمسؤول' : isEn ? 'Method & Author' : 'Règlement & Caissier',
                primaryText: e.paymentMethod === 'Cash' ? 'Espèces' : e.paymentMethod,
                secondaryText: e.paidBy,
              },
              detailCol3: {
                heading: isAr ? 'المبلغ المصروف' : isEn ? 'Amount' : 'Montant Décaissement',
                primaryText: `-${formatMoney(e.amount)}`,
                secondaryText: new Date(e.createdAt).toLocaleDateString(),
              },
            };
          }}
          getFanActions={(e): KineticRowFanAction[] => [
            {
              id: 'inspect',
              label: isAr ? 'معاينة' : 'Détails',
              icon: <Eye className="w-[15px] h-[15px]" />,
              onClick: (ev) => {
                setDrawerOpenerEl(ev.currentTarget);
                setInspectorTab('overview');
                setInspectingExpense(e);
              },
            },
            {
              id: 'del',
              label: isAr ? 'حذف' : 'Supprimer',
              icon: <Trash2 className="w-[15px] h-[15px]" />,
              isDanger: true,
              onClick: () => handleDeleteExpense(e.id),
            },
          ]}
          getDetailActions={(e): KineticDetailAction[] => [
            {
              id: 'inspect',
              label: isAr ? 'تفاصيل' : 'Ouvrir fiche',
              icon: <Eye className="w-3.5 h-3.5" />,
              onClick: () => {
                setInspectorTab('overview');
                setInspectingExpense(e);
              },
            },
            {
              id: 'zreport',
              label: isAr ? 'تقرير Z' : 'Rapport Z',
              icon: <Printer className="w-3.5 h-3.5" />,
              onClick: () => setIsZReportOpen(true),
            },
          ]}
          selectedIds={selectedExpenseIds}
          onSelectionChange={setSelectedExpenseIds}
          pinnedIds={pinnedExpenseIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedExpenseIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          emptyTitle={isAr ? 'لا توجد مصاريف مطابقة' : 'Aucune dépense de caisse trouvée'}
          emptyDescription={isAr ? 'انقر على إضافة سحب لتسجيل مصاريف جديدة' : 'Enregistrez vos achats de fournitures ou paiements fournisseurs.'}
          primaryActionLabel={isAr ? 'إضافة سحب' : 'Nouvelle Dépense'}
          onAddFirstItem={() => setIsExpenseModalOpen(true)}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveAdvancedFilters || methodFilter !== 'all' || searchQuery.trim().length > 0}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedExpenses.length}
        entityPluralLabel={isAr ? 'مصاريف' : 'dépenses'}
        hasActiveFilters={hasActiveAdvancedFilters || methodFilter !== 'all'}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<PosExpense>
        isOpen={inspectingExpense !== null}
        item={inspectingExpense}
        allItems={sortedExpenses}
        keyExtractor={(e) => e.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectingExpense?.payee || ''}
        subtitle={inspectingExpense ? `${inspectingExpense.reference} · ${new Date(inspectingExpense.createdAt).toLocaleString()}` : undefined}
        avatarText={inspectingExpense ? getInitials2(inspectingExpense.payee) : 'DP'}
        avatarColor="#d4522f"
        branchName={inspectingExpense ? resolveRecordBranch(inspectingExpense, branchesById, currentBranch, language).name : undefined}
        statusLabel={inspectingExpense?.category}
        statusClassName={MEMBER_PILL_DANGER}
        tabs={[
          { id: 'overview', label: isAr ? 'الملخص' : isEn ? 'Overview' : 'Sortie' },
          { id: 'details', label: isAr ? 'التدقيق' : isEn ? 'Details' : 'Contrôle' },
          { id: 'actions', label: isAr ? 'إجراءات' : isEn ? 'Actions' : 'Actions' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onClose={() => setInspectingExpense(null)}
        onSelectItem={(e) => {
          setInspectorTab('overview');
          setInspectingExpense(e);
        }}
        holdToDelete
        deleteLabel={isAr ? 'حذف' : 'Supprimer'}
        onDelete={(e) => handleDeleteExpense(e.id)}
        renderBody={(exp, tab) => {
          if (tab === 'details') {
            return (
              <div className="space-y-4">
                <InspectorSection index={0} title={isAr ? 'بيانات الخزينة' : 'Traçabilité Caisse'}>
                  <InspectorCard>
                    <InspectorKeyValue label={isAr ? 'المرجع' : 'Référence'} value={exp.reference} copyText={exp.reference} />
                    <InspectorKeyValue label={isAr ? 'التصنيف' : 'Catégorie'} value={exp.category} mono={false} />
                    <InspectorKeyValue label={isAr ? 'التاريخ' : 'Horodatage'} value={new Date(exp.createdAt).toLocaleString()} />
                    <InspectorKeyValue label={isAr ? 'الملاحظات' : 'Motif'} value={exp.notes || 'Sortie caisse standard'} mono={false} isLast />
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
                        id: 'zreport',
                        label: isAr ? 'تقرير Z' : 'Rapport Z',
                        icon: <Printer size={16} />,
                        primary: true,
                        onClick: () => {
                          setInspectingExpense(null);
                          setIsZReportOpen(true);
                        },
                      },
                      {
                        id: 'new',
                        label: isAr ? 'سحب جديد' : 'Nouvelle sortie',
                        icon: <Plus size={16} />,
                        onClick: () => {
                          setInspectingExpense(null);
                          setIsExpenseModalOpen(true);
                        },
                      },
                    ]}
                  />
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={isAr ? 'إصدار تقرير Z اليومي' : 'Éditer le Rapport Z de Clôture'}
                    icon={<Printer size={15} />}
                    onClick={() => {
                      setInspectingExpense(null);
                      setIsZReportOpen(true);
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
                  value={`-${formatMoney(exp.amount)}`}
                  tone="danger"
                  caption={`${exp.paymentMethod} · ${exp.paidBy}`}
                />
              </InspectorSection>
              <InspectorSection index={1} title={isAr ? 'تفاصيل المصروف' : 'Détails Sortie'}>
                <InspectorCard>
                  <InspectorKeyValue label={isAr ? 'المستفيد' : 'Bénéficiaire'} value={exp.payee} mono={false} />
                  <InspectorKeyValue label={isAr ? 'الوسيلة' : 'Mode'} value={exp.paymentMethod} />
                  <InspectorKeyValue label={isAr ? 'المسؤول' : 'Caissier'} value={exp.paidBy} mono={false} />
                  <InspectorKeyValue label={isAr ? 'المرجع' : 'Référence'} value={exp.reference} copyText={exp.reference} isLast />
                </InspectorCard>
              </InspectorSection>
            </div>
          );
        }}
      />

      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={isAr ? 'تسجيل سحب نقدي من الصندوق' : 'Enregistrer une Sortie de Caisse'}
        subtitle={`Session ${currentBranch.name}`}
      >
        <form onSubmit={handleAddExpense} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <LabelInput
            field="Payee"
            label={isAr ? 'المستفيد / الجهة الموردة' : 'Bénéficiaire / Fournisseur'}
            required
            value={expPayee}
            onChange={setExpPayee}
            placeholder="Ex: Boulangerie, Fournisseur café, Quincaillerie..."
            width="100%"
            height={44}
            corner={12}
          />
          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="Amount"
              label={isAr ? 'المبلغ (د.ج)' : 'Montant (DZD)'}
              type="number"
              required
              value={expAmount ? String(expAmount) : ''}
              onChange={(v) => setExpAmount(parseFloat(v) || 0)}
              width="100%"
              height={44}
              corner={12}
            />
            <LabelSelect
              field="Category"
              label={isAr ? 'التصنيف' : 'Catégorie de charge'}
              value={expCategory}
              onChange={(val) => setExpCategory(typeof val === 'string' ? (val as any) : (val.target?.value || val))}
              options={[
                { value: 'Supplies', label: 'Fournitures & Emballages' },
                { value: 'Supplier', label: 'Règlement Fournisseur' },
                { value: 'Maintenance', label: 'Entretien & Réparation' },
                { value: 'Transport', label: 'Livraison & Course' },
                { value: 'StaffMeal', label: 'Collation / Repas équipe' },
                { value: 'Other', label: 'Autre dépense' },
              ]}
              height={44}
              corner={12}
            />
          </div>
          <LabelSelect
            field="Method"
            label={isAr ? 'طريقة السحب' : 'Mode de paiement'}
            value={expMethod}
            onChange={(val) => setExpMethod(typeof val === 'string' ? (val as any) : (val.target?.value || val))}
            options={[
              { value: 'Cash', label: 'Espèces (Du tiroir-caisse)' },
              { value: 'Card', label: 'Carte d’entreprise' },
              { value: 'BaridiMob', label: 'Virement BaridiMob' },
            ]}
            height={44}
            corner={12}
          />
          <LabelInput
            field="Notes"
            label={isAr ? 'ملاحظات أو رقم الفاتورة' : 'Notes / Réf reçu'}
            value={expNotes}
            onChange={setExpNotes}
            placeholder="Facture #412..."
            width="100%"
            height={44}
            corner={12}
          />
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-black/55 dark:text-white/55 rounded-full hover:bg-neutral-100 cursor-pointer"
            >
              {t('action_cancel')}
            </button>
            <button
              type="submit"
              className="h-10 px-5 text-xs font-bold text-white bg-[#d4522f] rounded-full hover:opacity-90 cursor-pointer shadow-xs"
            >
              {isAr ? 'تأكيد السحب' : 'Valider la Dépense'}
            </button>
          </div>
        </form>
      </Modal>

      {isZReportOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsZReportOpen(false)}
          title={isAr ? 'تقرير Z اليومي - إغلاق الصندوق' : 'Rapport Z · Clôture Journalière'}
          subtitle={`Session ${new Date().toISOString().split('T')[0]} · ${currentBranch.name}`}
        >
          <div className="space-y-4 font-mono text-xs leading-relaxed" dir="ltr">
            <div
              data-sq="card"
              data-sq-border="solid"
              className="p-4 bg-white text-black [--sq-stroke:#D4D4D4] space-y-2"
            >
              <div className="text-center font-bold pb-2 border-b border-dashed border-neutral-400">
                <div className="text-sm font-black uppercase">RAPPORT Z - CLÔTURE DE CAISSE</div>
                <div className="text-[10px] text-black/75">{currentBranch.name}</div>
                <div className="text-[10px] text-black/55">{new Date().toLocaleString()}</div>
                <div className="text-[10px] text-black/55">CAISSIER : {currentUser?.fullName || 'Amine Bentouati'}</div>
              </div>
              <div className="space-y-1 py-1 border-b border-dashed border-neutral-400 text-[11px]">
                <div className="flex justify-between">
                  <span>FOND DE CAISSE INITIAL :</span>
                  <span className="font-bold">{formatMoney(openingFloat)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VENTES BRUTES :</span>
                  <span className="font-bold">{formatMoney(financeTotals.totalGrossSales)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>SORTIES DE CAISSE :</span>
                  <span>-{formatMoney(financeTotals.totalCashPayouts)}</span>
                </div>
                <div className="flex justify-between pt-1 font-black text-sm">
                  <span>SOLDE THÉORIQUE ATTENDU :</span>
                  <span>{formatMoney(financeTotals.expectedCashInDrawer)}</span>
                </div>
              </div>
              <div className="space-y-1 py-1 border-b border-dashed border-neutral-400 text-[11px]">
                <div className="font-bold text-[10px] text-black/55 uppercase">VENTILATION PAR MODE DE PAIEMENT :</div>
                <div className="flex justify-between">
                  <span>ESPÈCES :</span>
                  <span className="font-bold">{formatMoney(financeTotals.cashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CARTE CIB / EDAHABIA :</span>
                  <span className="font-bold">{formatMoney(financeTotals.cardSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>BARIDIMOB / VIREMENT :</span>
                  <span className="font-bold">{formatMoney(financeTotals.baridiMobSales)}</span>
                </div>
              </div>
              {financeTotals.hasCounted && (
                <div className="space-y-1 py-1 border-b border-dashed border-neutral-400 text-[11px]">
                  <div className="flex justify-between font-bold">
                    <span>ESPÈCES PHYSICOMPTÉES :</span>
                    <span>{formatMoney(financeTotals.actualCounted)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ÉCART DE CAISSE :</span>
                    <span className={financeTotals.cashVariance >= 0 ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                      {financeTotals.cashVariance >= 0 ? `+${formatMoney(financeTotals.cashVariance)}` : formatMoney(financeTotals.cashVariance)}
                    </span>
                  </div>
                </div>
              )}
              <div className="pt-2 text-[10px] text-center text-black/75">
                SIGNATURE ET VISA DU RESPONSABLE DU POINT DE VENTE
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-10 px-4 rounded-full bg-[#d4522f] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90"
              >
                <Printer size={14} />
                <span>Imprimer Rapport Z 80mm</span>
              </button>
              <button
                type="button"
                onClick={() => setIsZReportOpen(false)}
                className="h-10 px-4 rounded-full text-black/55 dark:text-white/55 hover:bg-neutral-100 text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
