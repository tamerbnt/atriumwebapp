import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  DollarSign,
  Receipt,
  CreditCard,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  Printer,
  Send,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentMembersFromState,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { pickLocalizedText, runUndoBatch } from '../../../services/undoEngine';
import { formatMoney } from '../../../utils/rules';
import { t } from '../../../utils/i18n';
import { useTranslation } from '../../../utils/useTranslation';
import { AtriumButton } from '../../ui/AtriumButton';
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
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';

interface MembershipTransaction {
  id: string;
  memberId: string;
  memberName: string;
  plan: string;
  amount: number;
  paymentMethod: 'Cash' | 'Card' | 'BaridiMob';
  date: string;
  status: 'Settled' | 'Pending';
  branchId?: string;
  branchName?: string;
}

export const MembershipFinanceView: React.FC = React.memo(() => {
  const {
    members,
    branches,
    currentBranch,
    language,
    isSyncing,
    networkMode,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumSelector(
    (s) => ({
      members: selectCurrentMembersFromState(s),
      branches: s.branches,
      currentBranch: selectCurrentBranchFromState(s),
      language: s.language,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      lastSyncedAt: s.lastSyncedAt,
      isSyncTimeout: s.isSyncTimeout || false,
    }),
    shallowEqualObjects
  );

  const { retryCloudSync, updateMember } = useAtriumActions();
  const { t } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';
  const estimatedBadgeLabel = t('membership_finance_estimated_badge');
  const estimatedBannerText = t('membership_finance_estimated_banner');
  const estimatedCsvNote = t('membership_finance_estimated_csv_note');

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'All' | 'Cash' | 'Card' | 'BaridiMob'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Settled' | 'Pending'>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(() => new Set());
  const [pinnedTxIds, setPinnedTxIds] = useState<Set<string>>(() => new Set());
  const [selectedTx, setSelectedTx] = useState<MembershipTransaction | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const transactions: MembershipTransaction[] = useMemo(() => {
    return members.map((m: any, idx) => {
      const bInfo = resolveRecordBranch(m, branchesById, currentBranch, language);
      const pendingDue = Number(m.balanceDue ?? m.balance ?? 0);
      return {
        id: `TX-GYM-${String(m.id).slice(-5)}-${idx + 1}`,
        memberId: m.id,
        memberName: m.fullName || 'Adhérent',
        plan:
          m.membershipType ||
          m.membershipPlanName ||
          (isAr ? 'اشتراك لياقة شهري' : isEn ? 'Monthly Fitness Pass' : 'Pass Fitness Mensuel'),
        amount: Number(m.membershipFee || 4500),
        paymentMethod: idx % 3 === 0 ? 'BaridiMob' : idx % 2 === 0 ? 'Card' : 'Cash',
        date: new Date(Date.now() - idx * 86400000 * 2).toISOString().slice(0, 10),
        status: pendingDue > 0 ? 'Pending' : 'Settled',
        branchId: bInfo.id,
        branchName: bInfo.name,
      };
    });
  }, [members, branchesById, currentBranch, language, isAr, isEn]);

  const financialMetrics = useMemo(() => {
    let totalCollected = 0;
    let settledCount = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    const branchCounts = new Map<string, number>();

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      totalCollected += tx.amount;
      if (tx.status === 'Settled') settledCount++;
      else {
        pendingCount++;
        pendingAmount += tx.amount;
      }
      const bName = tx.branchName || currentBranch?.name || 'Main Branch';
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    }

    const activeSubscriptions = members.filter((m) => m.status === 'Active').length;
    return {
      totalCollected,
      settledCount,
      pendingCount,
      pendingAmount,
      activeSubscriptions,
      branchOptionsWithCounts: Array.from(branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    };
  }, [transactions, members, currentBranch]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (statusFilter !== 'All' && tx.status !== statusFilter) return false;
      if (methodFilter !== 'All' && tx.paymentMethod !== methodFilter) return false;
      if (branchFilter !== 'All' && tx.branchName !== branchFilter) return false;
      if (q) {
        return (
          tx.memberName.toLowerCase().includes(q) ||
          tx.id.toLowerCase().includes(q) ||
          tx.plan.toLowerCase().includes(q) ||
          (tx.branchName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transactions, statusFilter, methodFilter, branchFilter, searchQuery]);

  const sortedTransactions = useMemo(() => {
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filteredTransactions].sort((a, b) => {
      const aPinned = pinnedTxIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedTxIds.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      if (sortBy === 'memberName') return a.memberName.localeCompare(b.memberName) * sign;
      if (sortBy === 'plan') return a.plan.localeCompare(b.plan) * sign;
      if (sortBy === 'status') return a.status.localeCompare(b.status) * sign;
      if (sortBy === 'amount') return (a.amount - b.amount) * sign;
      if (sortBy === 'branch') return (a.branchName || '').localeCompare(b.branchName || '') * sign;
      return a.date.localeCompare(b.date) * sign;
    });
  }, [filteredTransactions, pinnedTxIds, sortBy, sortDir]);

  const handleResetFilters = useCallback(() => {
    setMethodFilter('All');
    setStatusFilter('All');
    setBranchFilter('All');
    setSearchQuery('');
    setIsFilterModalOpen(false);
  }, []);

  const getRowMeta = useCallback(
    (tx: MembershipTransaction): Partial<KineticRowData> => ({
      subline: `${tx.id} · ${tx.date} · ${estimatedBadgeLabel}`,
      categoryLabel: tx.plan,
      statusLabel:
        tx.status === 'Settled'
          ? isAr ? 'مسدد' : isEn ? 'Settled' : 'Encaissé'
          : isAr ? 'متبقي' : isEn ? 'Pending' : 'En attente',
      statusVariant: tx.status === 'Settled' ? 'active' : 'warning',
      metricPrimary: formatMoney(tx.amount),
      metricSecondary:
        tx.paymentMethod === 'BaridiMob'
          ? 'BaridiMob'
          : tx.paymentMethod === 'Card'
          ? 'CIB / Dahabia'
          : isAr ? 'نقداً' : 'Espèces',
      detailCol1: {
        heading: isAr ? 'المشترك والإيصال' : isEn ? 'Member & Receipt' : 'Adhérent & Reçu',
        primaryText: tx.id,
        secondaryText: tx.memberName,
        tertiaryText: tx.branchName || currentBranch?.name || 'Main',
      },
      detailCol2: {
        heading: isAr ? 'الاشتراك والمبلغ' : isEn ? 'Plan & Settlement' : 'Formule & Règlement',
        primaryText: formatMoney(tx.amount),
        secondaryText: tx.plan,
        tertiaryText:
          tx.status === 'Settled'
            ? isAr ? 'تم التحصيل بالكامل' : isEn ? 'Fully settled' : 'Encaissé intégralement'
            : isAr ? 'في انتظار التحصيل' : isEn ? 'Balance due' : 'Solde en attente',
      },
      detailCol3: {
        heading: isAr ? 'قناة الدفع والتاريخ' : isEn ? 'Channel & Audit' : 'Canal & Traçabilité',
        primaryText:
          tx.paymentMethod === 'BaridiMob'
            ? 'BaridiMob E-Pay'
            : tx.paymentMethod === 'Card'
            ? 'CIB / Edahabia'
            : isAr ? 'دفع نقدي' : isEn ? 'Cash Desk' : 'Caisse Espèces',
        secondaryText: `${isAr ? 'تاريخ العملية' : isEn ? 'Recorded' : 'Enregistré le'} ${tx.date}`,
      },
    }),
    [isAr, isEn, currentBranch]
  );

  const handleSettleTx = useCallback(
    (tx: MembershipTransaction) => {
      updateMember?.(tx.memberId, { balance: 0 } as any);
    },
    [updateMember]
  );

  const getFanActions = useCallback(
    (tx: MembershipTransaction): KineticRowFanAction[] => [
      ...(tx.status === 'Pending'
        ? [
            {
              id: 'settle',
              label: isAr ? 'تحصيل' : isEn ? 'Settle' : 'Encaisser',
              icon: <CheckCircle2 className="w-[15px] h-[15px]" />,
              onClick: () => handleSettleTx(tx),
            },
          ]
        : []),
      {
        id: 'print',
        label: isAr ? 'طباعة' : isEn ? 'Print' : 'Imprimer',
        icon: <Printer className="w-[15px] h-[15px]" />,
        onClick: () => window.print(),
      },
      {
        id: 'open',
        label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
        icon: <Receipt className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedTx(tx);
        },
      },
    ],
    [handleSettleTx, isAr, isEn]
  );

  const getDetailActions = useCallback(
    (tx: MembershipTransaction): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'عرض الوصل' : isEn ? 'View Receipt' : 'Fiche complète',
        icon: <Receipt className="w-3.5 h-3.5" />,
        onClick: () => setSelectedTx(tx),
      },
      ...(tx.status === 'Pending'
        ? [
            {
              id: 'settle',
              label: isAr ? 'تأكيد التسديد' : isEn ? 'Mark Settled' : 'Encaisser',
              icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#096b40]" />,
              onClick: () => handleSettleTx(tx),
            },
          ]
        : []),
      {
        id: 'print',
        label: isAr ? 'طباعة' : isEn ? 'Print' : 'Imprimer',
        icon: <Printer className="w-3.5 h-3.5" />,
        onClick: () => window.print(),
      },
    ],
    [handleSettleTx, isAr, isEn]
  );

  const handleBulkSettle = useCallback(
    (ids: Set<string>) => {
      const pendingTargets = transactions.filter((tx) => ids.has(tx.id) && tx.status === 'Pending');
      if (pendingTargets.length === 0) {
        setSelectedTxIds(new Set());
        return;
      }
      runUndoBatch(
        {
          vertical: 'membership_session',
          operationType: 'bulk',
          affectedCount: pendingTargets.length,
          toastType: 'success',
          summary: pickLocalizedText(language, {
            en: `Settled ${pendingTargets.length} member balance(s)`,
            fr: `Encaissement groupé (${pendingTargets.length} règlements)`,
            ar: `تسوية جماعية (${pendingTargets.length} معاملات)`,
          }),
        },
        () => {
          pendingTargets.forEach((tx) => {
            updateMember?.(tx.memberId, { balance: 0 } as any);
          });
        }
      );
      setSelectedTxIds(new Set());
    },
    [transactions, updateMember, language]
  );

  const hasActiveAdvancedFilters = methodFilter !== 'All' || branchFilter !== 'All';
  const activeFiltersCount = (methodFilter !== 'All' ? 1 : 0) + (branchFilter !== 'All' ? 1 : 0);

  const handleExportCSV = useCallback(() => {
    const headers = [
      isAr ? 'رقم الإيصال' : isEn ? 'Receipt #' : 'Réf. Reçu',
      isAr ? 'المشترك' : isEn ? 'Member' : 'Adhérent',
      isAr ? 'الباقة' : isEn ? 'Plan' : 'Formule',
      isAr ? 'طريقة الدفع' : isEn ? 'Method' : 'Règlement',
      isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
      isAr ? 'التاريخ' : isEn ? 'Date' : 'Date',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
      isAr ? 'المبلغ' : isEn ? 'Amount' : 'Montant',
      isAr ? 'مصدر الدفتر' : isEn ? 'Ledger Source' : 'Source Comptable',
    ];
    const rows = sortedTransactions.map((tx) => [
      tx.id,
      tx.memberName,
      tx.plan,
      tx.paymentMethod,
      tx.status,
      tx.date,
      tx.branchName || currentBranch?.name || 'Main',
      tx.amount,
      estimatedCsvNote,
    ]);
    downloadCsvSafe(
      `atrium-membership-finance-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast?.({
      type: 'success',
      title: isAr ? 'تصدير السجل' : isEn ? 'Ledger Exported' : 'Journal exporté',
      message: `${rows.length} ${isAr ? 'عملية' : isEn ? 'transactions' : 'écritures'}`,
    });
  }, [sortedTransactions, isAr, isEn, currentBranch, showToast, estimatedCsvNote]);

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: transactions.length },
      {
        value: 'Settled',
        label: isAr ? 'مسدد' : isEn ? 'Settled' : 'Encaissé',
        count: financialMetrics.settledCount,
      },
      {
        value: 'Pending',
        label: isAr ? 'متبقي' : isEn ? 'Pending' : 'En attente',
        count: financialMetrics.pendingCount,
      },
    ],
    [isAr, isEn, transactions.length, financialMetrics.settledCount, financialMetrics.pendingCount]
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
          {
            value: 'All',
            label: isAr ? 'كل الفروع' : isEn ? 'All Branches' : 'Toutes les branches',
            count: transactions.length,
          },
          ...financialMetrics.branchOptionsWithCounts,
        ],
      },
      {
        id: 'method',
        label: isAr ? 'طريقة الدفع' : isEn ? 'Payment Method' : 'Mode de règlement',
        value: methodFilter,
        onChange: (val) => setMethodFilter(val as any),
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous' },
          { value: 'Cash', label: isAr ? 'نقداً' : isEn ? 'Cash' : 'Espèces' },
          { value: 'Card', label: 'CIB' },
          { value: 'BaridiMob', label: 'BaridiMob' },
        ],
      },
      {
        id: 'status',
        label: isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
        value: statusFilter,
        onChange: (val) => setStatusFilter(val as any),
        kind: 'segmented',
        options: statusOptions,
      },
    ],
    [
      isAr,
      isEn,
      branchFilter,
      transactions.length,
      financialMetrics.branchOptionsWithCounts,
      methodFilter,
      statusFilter,
      statusOptions,
    ]
  );

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') });
    }
    if (methodFilter !== 'All') {
      chips.push({
        key: 'method',
        label: methodFilter === 'Cash' ? (isAr ? 'نقداً' : 'Espèces') : methodFilter,
        onRemove: () => setMethodFilter('All'),
      });
    }
    return chips;
  }, [branchFilter, methodFilter, isAr]);

  const columns: ColumnDefinition<MembershipTransaction>[] = useMemo(
    () => [
      {
        id: 'memberName',
        header: isAr ? 'المشترك والوصل' : isEn ? 'Member & Receipt' : 'Adhérent & Reçu',
        accessorKey: 'memberName',
        sortable: true,
        renderCell: (tx) => (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#F3EDE7] dark:bg-[#262422] flex items-center justify-center t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0">
              {tx.memberName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="t-label font-semibold text-black dark:text-white truncate block">
                {tx.memberName}
              </span>
              <span className="tabular-nums t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold block">
                {tx.id} · {tx.date}
              </span>
              <span className="t-cap text-amber-700 dark:text-amber-300 font-medium block">
                {estimatedBadgeLabel}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: 'plan',
        header: isAr ? 'الاشتراك والدفع' : isEn ? 'Plan & Method' : 'Formule & Règlement',
        accessorKey: 'plan',
        sortable: true,
        renderCell: (tx) => (
          <div className="min-w-0">
            <span className="t-small font-semibold text-black dark:text-white truncate block">
              {tx.plan}
            </span>
            <span className="t-cap text-black/62 dark:text-white/65">
              {tx.paymentMethod === 'BaridiMob'
                ? 'BaridiMob'
                : tx.paymentMethod === 'Card'
                ? 'CIB / Dahabia'
                : isAr
                ? 'نقداً'
                : 'Espèces'}
            </span>
          </div>
        ),
      },
      {
        id: 'status',
        header: isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
        accessorKey: 'status',
        sortable: true,
        renderCell: (tx) => (
          <span
            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full t-small font-semibold ${
              tx.status === 'Settled'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                tx.status === 'Settled' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            {tx.status === 'Settled'
              ? isAr ? 'مسدد' : isEn ? 'Settled' : 'Encaissé'
              : isAr ? 'متبقي' : isEn ? 'Pending' : 'En attente'}
          </span>
        ),
      },
      {
        id: 'amount',
        header: isAr ? 'المبلغ المحصل' : isEn ? 'Amount' : 'Montant Encaissé',
        accessorKey: 'amount',
        sortable: true,
        renderCell: (tx) => (
          <div className="tabular-nums">
            <span className="tabular-nums t-label font-semibold text-black dark:text-white block">
              {formatMoney(tx.amount)}
            </span>
            <span className="t-cap text-black/62 dark:text-white/65 block">{tx.date}</span>
          </div>
        ),
      },
      {
        id: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        accessorKey: 'branchName',
        sortable: true,
        renderCell: (tx) => (
          <span className="t-small font-medium text-black/80 dark:text-white/85 truncate block">
            {tx.branchName || currentBranch?.name || 'Main'}
          </span>
        ),
      },
    ],
    [isAr, isEn, currentBranch]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: members.length > 0,
  });

  if (showSkeleton && (members.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.4*', minWidth: '180px' },
          { width: '1.6*', minWidth: '130px' },
          { width: '1.3*', minWidth: '110px' },
          { width: '1.3*', minWidth: '110px' },
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
    <div className="w-full space-y-6 animate-in fade-in duration-200 relative">
      <ScreenHeaderBar
        icon={<DollarSign size={22} />}
        title={isAr ? 'المالية' : isEn ? 'Finance' : 'Finances'}
        primaryAction={{
          label: isAr ? 'تذكير بالمتأخرات' : isEn ? 'Send Reminders' : 'Relancer impayés',
          icon: <Send size={15} />,
          disabled: true,
          tooltip: t('feature_not_available_phase2', language),
          onClick: () => {},
        }}
      />

      <div
        data-testid="membership-finance-estimated-banner"
        className="rounded-2xl border border-amber-500/30 bg-amber-50/90 dark:bg-amber-950/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Clock size={16} className="text-amber-700 dark:text-amber-300 shrink-0" />
          <p className="t-small text-amber-950 dark:text-amber-100">
            <span className="font-semibold me-2">{estimatedBadgeLabel}:</span>
            <span>{estimatedBannerText}</span>
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-200 t-cap font-semibold shrink-0">
          {estimatedBadgeLabel}
        </span>
      </div>

      <ScreenKpiBanner
        heading={isAr ? 'ملخص الخزينة والتدفقات' : isEn ? 'Treasury Overview' : 'Trésorerie & Encaissements'}
        language={language}
        primaryCard={{
          label: isAr ? 'الاشتراكات المسددة' : isEn ? 'Settled Subscriptions' : 'Cotisations Encaissées',
          badgeText: `↗ ${financialMetrics.activeSubscriptions} ${isAr ? 'نشط' : isEn ? 'active' : 'actifs'}`,
          count: financialMetrics.settledCount,
          tone: 'emerald',
          isActive: statusFilter === 'Settled',
          onToggle: () => setStatusFilter((p) => (p === 'Settled' ? 'All' : 'Settled')),
        }}
        secondaryCard={{
          label: isAr ? 'مستحقات قيد التحصيل' : isEn ? 'Pending Balances' : 'Restes à Recouvrer',
          badgeText: isAr ? 'قيد الانتظار' : isEn ? 'pending' : 'en attente',
          count: financialMetrics.pendingCount,
          tone: 'terracotta',
          isActive: statusFilter === 'Pending',
          onToggle: () => setStatusFilter((p) => (p === 'Pending' ? 'All' : 'Pending')),
        }}
        darkCard={{
          label: isAr ? 'إجمالي التحصيلات' : isEn ? 'Total Gym Revenue' : 'Chiffre d’Affaires Salle',
          badgePrefix: '',
          badgeCount: financialMetrics.activeSubscriptions,
          badgeSuffix: isAr ? 'اشتراك' : isEn ? 'active' : 'abonnés',
          valuePrefix: '',
          valueCount: financialMetrics.totalCollected,
          formatValue: (n) => formatMoney(n),
          caption: `${currentBranch?.name || 'Club Principal'} · ${
            isAr ? 'صندوق مفتوح' : isEn ? 'Register Open' : 'Caisse Ouverte'
          }`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'سجل المدفوعات' : isEn ? 'Transactions Ledger' : 'Journal des règlements'}
          liveRegionText={`${sortedTransactions.length} ${isAr ? 'معاملة' : 'règlements'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr
              ? 'بحث بالإيصال، المشترك أو الفرع...'
              : isEn
              ? 'Search receipt, member, branch...'
              : 'Rechercher reçu, adhérent, branche...'
          }
          statusOptions={statusOptions}
          statusValue={statusFilter}
          onStatusChange={(v) => setStatusFilter(v as any)}
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

        <UniversalDataCollection<MembershipTransaction>
          data={sortedTransactions}
          columns={columns}
          keyExtractor={(tx) => tx.id}
          viewMode={viewMode}
          hideToolbar
          openItemId={selectedTx?.id ?? null}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          selectedIds={selectedTxIds}
          onSelectionChange={setSelectedTxIds}
          pinnedIds={pinnedTxIds}
          onPinToggle={(id: any) => {
            const key = typeof id === 'string' ? id : id?.id;
            setPinnedTxIds((prev) => {
              const next = new Set(prev);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              return next;
            });
          }}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(col, dir) => {
            setSortBy(col);
            setSortDir(dir);
          }}
          onItemClick={(tx, opener) => {
            setDrawerOpenerEl(opener || null);
            setSelectedTx(tx);
          }}
          onViewDetails={(tx, opener) => {
            setDrawerOpenerEl(opener || null);
            setSelectedTx(tx);
          }}
          getRowMeta={getRowMeta}
          getFanActions={getFanActions}
          getDetailActions={getDetailActions}
          bulkSecondaryAction={{
            label: isAr ? 'تحصيل المحدد' : isEn ? 'Settle Selected' : 'Encaisser sélection',
            icon: <CheckCircle2 size={14} />,
            onClick: handleBulkSettle,
            variant: 'primary',
          }}
          emptyTitle={isAr ? 'لا توجد معاملات' : isEn ? 'No transactions found' : 'Aucun règlement trouvé'}
          emptyDescription={
            isAr
              ? 'جرب تغيير مرشحات البحث أو الفرع'
              : isEn
              ? 'Try adjusting search or branch filters.'
              : 'Ajustez vos critères de recherche ou filtres.'
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
        displayCount={sortedTransactions.length}
        entityPluralLabel={isAr ? 'معاملات' : isEn ? 'transactions' : 'règlements'}
        hasActiveFilters={hasActiveAdvancedFilters}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<MembershipTransaction>
        isOpen={selectedTx !== null}
        item={selectedTx}
        allItems={sortedTransactions}
        keyExtractor={(tx) => tx.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={selectedTx?.memberName || ''}
        subtitle={selectedTx ? `${selectedTx.id} · ${selectedTx.date}` : undefined}
        avatarText={selectedTx ? selectedTx.memberName.slice(0, 2).toUpperCase() : undefined}
        branchName={selectedTx?.branchName}
        statusLabel={
          selectedTx?.status === 'Settled'
            ? isAr ? 'مسدد' : isEn ? 'Settled' : 'Encaissé'
            : isAr ? 'متبقي' : isEn ? 'Pending' : 'En attente'
        }
        statusClassName={
          selectedTx?.status === 'Settled'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
        }
        tabs={[
          { id: 'overview', label: isAr ? 'نظرة عامة' : isEn ? 'Overview' : 'Aperçu & Montant' },
          { id: 'receipt', label: isAr ? 'الإيصال والدفع' : isEn ? 'Receipt & Method' : 'Reçu & Règlement' },
          { id: 'ledger', label: isAr ? 'سجل التدقيق' : isEn ? 'Audit Log' : 'Suivi comptable' },
        ]}
        onClose={() => setSelectedTx(null)}
        onSelectItem={(tx) => setSelectedTx(tx)}
        holdToDelete={false}
        renderBody={(tx, activeTab) => {
          const methodLabel =
            tx.paymentMethod === 'BaridiMob'
              ? 'BaridiMob'
              : tx.paymentMethod === 'Card'
              ? 'CIB / Edahabia'
              : isAr ? 'نقداً' : isEn ? 'Cash' : 'Espèces';

          if (activeTab === 'receipt') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'تفاصيل الإيصال' : isEn ? 'Receipt Breakdown' : 'Détails du reçu'}>
                  <InspectorCard>
                    <InspectorKeyValue
                      label={isAr ? 'المرجع' : isEn ? 'Reference' : 'Référence'}
                      value={tx.id}
                      copyText={tx.id}
                      onCopied={(v) => showToast?.({ type: 'success', title: isAr ? 'تم النسخ' : 'Copié', message: v })}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'الاشتراك' : isEn ? 'Plan' : 'Formule'}
                      value={tx.plan}
                      mono={false}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'طريقة الدفع' : isEn ? 'Method' : 'Règlement'}
                      value={methodLabel}
                      tone="accent"
                    />
                    <InspectorKeyValue
                      label={isAr ? 'التاريخ' : isEn ? 'Date' : 'Date d’écriture'}
                      value={tx.date}
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'ملخص الدفع' : isEn ? 'Settlement Summary' : 'Montant réglé'}>
                  <InspectorBigStat
                    value={formatMoney(tx.amount)}
                    tone={tx.status === 'Settled' ? 'ok' : 'accent'}
                    caption={`${tx.branchName || ''} · ${methodLabel}`}
                  />
                </InspectorSection>
              </>
            );
          }

          if (activeTab === 'ledger') {
            return (
              <InspectorSection index={0} title={isAr ? 'حركات الحساب' : isEn ? 'Ledger Trail' : 'Journal des écritures'}>
                <InspectorCard>
                  <InspectorListItem
                    title={tx.status === 'Settled' ? (isAr ? 'تأكيد التحصيل' : 'Encaissement validé') : (isAr ? 'إصدار المستحق' : 'Échéance émise')}
                    subtitle={`${tx.date} · ${methodLabel}`}
                    metaRight={formatMoney(tx.amount)}
                    badge={{
                      label: tx.status === 'Settled' ? (isAr ? 'مسدد' : 'Encaissé') : (isAr ? 'معلق' : 'En attente'),
                      tone: tx.status === 'Settled' ? 'ok' : 'warn',
                    }}
                  />
                  <InspectorListItem
                    title={tx.plan}
                    subtitle={tx.branchName || currentBranch?.name || 'Club Principal'}
                    badge={{ label: estimatedBadgeLabel, tone: 'warn' }}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            );
          }

          return (
            <>
              <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : isEn ? 'Quick Actions' : 'Actions rapides'}>
                <InspectorQuickActions
                  actions={[
                    ...(tx.status === 'Pending'
                      ? [
                          {
                            id: 'settle',
                            label: isAr ? 'تحصيل' : isEn ? 'Settle' : 'Valider règlement',
                            icon: <CheckCircle2 className="w-[18px] h-[18px]" />,
                            primary: true,
                            onClick: () => {
                              handleSettleTx(tx);
                              setSelectedTx(null);
                            },
                          },
                        ]
                      : [
                          {
                            id: 'print-p',
                            label: isAr ? 'طباعة' : isEn ? 'Print' : 'Imprimer reçu',
                            icon: <Printer className="w-[18px] h-[18px]" />,
                            primary: true,
                            onClick: () => window.print(),
                          },
                        ]),
                    {
                      id: 'print',
                      label: isAr ? 'نسخة PDF' : isEn ? 'Print Copy' : 'Reçu thermique',
                      icon: <Receipt className="w-[18px] h-[18px]" />,
                      onClick: () => window.print(),
                    },
                    {
                      id: 'remind',
                      label: isAr ? 'تذكير' : isEn ? 'Remind' : 'Relancer',
                      icon: <Send className="w-[18px] h-[18px]" />,
                      disabled: true,
                      tooltip: t('feature_not_available_phase2', language),
                      onClick: () => {},
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1}>
                <InspectorBigStat
                  value={formatMoney(tx.amount)}
                  tone={tx.status === 'Settled' ? 'ok' : 'accent'}
                  caption={`${methodLabel} · ${tx.date}`}
                  action={
                    tx.status === 'Pending'
                      ? {
                          label: isAr ? 'تأكيد التحصيل' : isEn ? 'Mark as Settled' : 'Encaisser le solde',
                          onClick: () => {
                            handleSettleTx(tx);
                            setSelectedTx(null);
                          },
                        }
                      : undefined
                  }
                />
              </InspectorSection>

              <InspectorSection index={2} title={isAr ? 'بيانات الاشتراك' : isEn ? 'Subscription Info' : 'Détails & Branche'}>
                <InspectorCard>
                  <InspectorKeyValue
                    label={isAr ? 'الاشتراك' : isEn ? 'Plan' : 'Formule'}
                    value={tx.plan}
                    mono={false}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'المرجع' : isEn ? 'Receipt ID' : 'Référence'}
                    value={tx.id}
                    copyText={tx.id}
                    onCopied={(v) => showToast?.({ type: 'success', title: isAr ? 'تم النسخ' : 'Copié', message: v })}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche'}
                    icon={<Building2 className="w-[15px] h-[15px]" />}
                    value={tx.branchName || currentBranch?.name || 'Main'}
                    mono={false}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'حالة الدفتر' : isEn ? 'Ledger Status' : 'État comptable'}
                    icon={<Clock className="w-[15px] h-[15px]" />}
                    value={estimatedBadgeLabel}
                    tone="warn"
                    mono={false}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />
    </div>
  );
});

MembershipFinanceView.displayName = 'MembershipFinanceView';
