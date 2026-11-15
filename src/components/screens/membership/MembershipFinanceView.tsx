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
import { formatMoney } from '../../../utils/rules';
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
  const isAr = language === 'ar';
  const isEn = language === 'en';

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
  }, [sortedTransactions, isAr, isEn, currentBranch, showToast]);

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
            <div className="w-8 h-8 rounded-full bg-[#F3EDE7] dark:bg-[#262422] flex items-center justify-center text-xs font-bold text-[#d4522f] shrink-0">
              {tx.memberName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="text-[13.5px] font-semibold text-black dark:text-white truncate block">
                {tx.memberName}
              </span>
              <span className="font-mono text-[11px] text-[#d4522f] font-semibold block">
                {tx.id} · {tx.date}
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
            <span className="text-[12.5px] font-semibold text-black dark:text-white truncate block">
              {tx.plan}
            </span>
            <span className="text-[11px] text-black/62 dark:text-white/65">
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
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold ${
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
            <span className="font-mono text-[13px] font-bold text-black dark:text-white block">
              {formatMoney(tx.amount)}
            </span>
            <span className="text-[11px] text-black/62 dark:text-white/65 block">{tx.date}</span>
          </div>
        ),
      },
      {
        id: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        accessorKey: 'branchName',
        sortable: true,
        renderCell: (tx) => (
          <span className="text-[12.5px] font-medium text-black/80 dark:text-white/85 truncate block">
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
          onClick: () =>
            showToast?.({
              type: 'success',
              title: isAr ? 'تم إرسال التنبيهات' : isEn ? 'Reminders Sent' : 'Relances envoyées',
              message: `${financialMetrics.pendingCount} ${
                isAr ? 'مشترك' : isEn ? 'members notified' : 'adhérents notifiés'
              }`,
            }),
        }}
      />

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
        avatarText={selectedTx ? selectedTx.memberName.charAt(0).toUpperCase() : undefined}
        branchName={selectedTx?.branchName}
        statusLabel={
          selectedTx?.status === 'Settled'
            ? isAr ? 'مسدد' : isEn ? 'Settled' : 'Encaissé'
            : isAr ? 'متبقي' : isEn ? 'Pending' : 'En attente'
        }
        statusClassName={
          selectedTx?.status === 'Settled'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }
        onClose={() => setSelectedTx(null)}
        onSelectItem={(tx) => setSelectedTx(tx)}
        renderBody={(tx) => (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex justify-between items-center">
              <div>
                <span className="text-[11px] font-semibold text-[#d4522f] uppercase block">
                  {isAr ? 'المبلغ المحصل' : isEn ? 'Amount' : 'Montant'}
                </span>
                <span className="text-2xl font-bold tabular-nums font-['Barlow_Condensed',sans-serif] rtl:font-sans text-black dark:text-white">
                  {formatMoney(tx.amount)}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] font-semibold">
                {tx.paymentMethod === 'Card' ? 'CIB / Dahabia' : tx.paymentMethod}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] space-y-2.5">
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">
                  {isAr ? 'نوع الاشتراك:' : isEn ? 'Plan:' : 'Formule :'}
                </span>
                <span className="font-semibold text-black dark:text-white">{tx.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">
                  {isAr ? 'التاريخ:' : isEn ? 'Date:' : 'Date :'}
                </span>
                <span className="font-mono font-semibold text-black dark:text-white tabular-nums">{tx.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">
                  {isAr ? 'الفرع:' : isEn ? 'Branch:' : 'Branche :'}
                </span>
                <span className="font-semibold text-black dark:text-white flex items-center gap-1">
                  <Building2 size={12} className="text-[#d4522f]" />
                  {tx.branchName}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {tx.status === 'Pending' && (
                <AtriumButton
                  type="button"
                  variant="primary"
                  icon={<CheckCircle2 size={15} />}
                  className="w-full justify-center"
                  onClick={() => {
                    updateMember?.(tx.memberId, { balance: 0 } as any);
                    showToast?.({
                      type: 'success',
                      title: isAr ? 'تم التحصيل' : isEn ? 'Settled' : 'Encaissé',
                      message: `${tx.memberName} (${formatMoney(tx.amount)})`,
                    });
                    setSelectedTx(null);
                  }}
                >
                  {isAr ? 'تأكيد التسديد' : isEn ? 'Mark as Settled' : 'Valider le règlement'}
                </AtriumButton>
              )}
              <AtriumButton
                type="button"
                variant="secondary"
                icon={<Printer size={15} />}
                className="w-full justify-center"
                onClick={() => window.print()}
              >
                {isAr ? 'طباعة الإيصال' : isEn ? 'Print Receipt' : 'Imprimer reçu'}
              </AtriumButton>
            </div>
          </div>
        )}
      />
    </div>
  );
});

MembershipFinanceView.displayName = 'MembershipFinanceView';
