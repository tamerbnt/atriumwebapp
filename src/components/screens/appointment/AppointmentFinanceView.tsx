import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  DollarSign,
  Check,
  Building2,
  Printer,
  CheckCircle2,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentAppointmentsFromState,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { StylistPayout } from '../../../types/index';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { formatMoney, localizeStatus } from '../../../utils/rules';
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
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const AppointmentFinanceView: React.FC = React.memo(() => {
  const {
    appointments,
    stylistPayouts,
    branches,
    currentBranch,
    language,
    isSyncing,
    networkMode,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumSelector(
    (s) => ({
      appointments: selectCurrentAppointmentsFromState(s),
      stylistPayouts: s.stylistPayouts || [],
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

  const { updateStylistPayoutStatus, retryCloudSync } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Paid'>('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [selectedPayoutIds, setSelectedPayoutIds] = useState<Set<string>>(() => new Set());
  const [pinnedPayoutIds, setPinnedPayoutIds] = useState<Set<string>>(() => new Set());
  const [sortBy, setSortBy] = useState<string>('totalPayout');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [inspectingPayout, setInspectingPayout] = useState<StylistPayout | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const metrics = useMemo(() => {
    let totalServicesRevenue = 0;
    let totalRetailRevenue = 0;
    let totalCommissionsDue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    const branchCounts = new Map<string, number>();

    for (let i = 0; i < stylistPayouts.length; i++) {
      const p = stylistPayouts[i];
      totalServicesRevenue += p.totalServiceRevenue || 0;
      totalRetailRevenue += p.retailSalesRevenue || 0;
      totalCommissionsDue += p.totalPayout || 0;
      if (p.status === 'Paid') paidCount++;
      else if (p.status === 'Approved') approvedCount++;
      else pendingCount++;
      const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    }

    const netSalonProfit = Math.max(0, totalServicesRevenue + totalRetailRevenue - totalCommissionsDue);

    let cash = 45000;
    let baridiMob = 68000;
    let cib = 29500;
    appointments.forEach((a) => {
      if (a.isPaid && a.paymentMethod) {
        if (a.paymentMethod === 'Cash') cash += a.price;
        else if (a.paymentMethod === 'BaridiMob') baridiMob += a.price;
        else cib += a.price;
      }
    });

    return {
      totalServicesRevenue,
      totalRetailRevenue,
      totalCommissionsDue,
      netSalonProfit,
      paidCount,
      pendingCount,
      approvedCount,
      cash,
      baridiMob,
      cib,
      branchOptionsWithCounts: Array.from(branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    };
  }, [stylistPayouts, appointments, branchesById, currentBranch, language]);

  const filteredPayouts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stylistPayouts.filter((p) => {
      if (selectedStatusFilter !== 'All' && p.status !== selectedStatusFilter) return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name.toLowerCase();
        return (
          p.staffName.toLowerCase().includes(q) ||
          p.periodStart.toLowerCase().includes(q) ||
          p.periodEnd.toLowerCase().includes(q) ||
          (p.paymentMethod || '').toLowerCase().includes(q) ||
          bName.includes(q)
        );
      }
      return true;
    });
  }, [stylistPayouts, selectedStatusFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedPayouts = useMemo(() => {
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filteredPayouts].sort((a, b) => {
      const aPinned = pinnedPayoutIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedPayoutIds.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      if (sortBy === 'staffName') return a.staffName.localeCompare(b.staffName) * sign;
      if (sortBy === 'totalServicesCount') return (a.totalServicesCount - b.totalServicesCount) * sign;
      if (sortBy === 'commissionRate') return (a.commissionRate - b.commissionRate) * sign;
      if (sortBy === 'status') return a.status.localeCompare(b.status) * sign;
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * sign;
      }
      return (a.totalPayout - b.totalPayout) * sign;
    });
  }, [filteredPayouts, pinnedPayoutIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleResetFilters = useCallback(() => {
    setSelectedStatusFilter('All');
    setBranchFilter('All');
    setSearchQuery('');
    setIsFilterModalOpen(false);
  }, []);

  const hasActiveAdvancedFilters = branchFilter !== 'All';
  const activeFiltersCount = branchFilter !== 'All' ? 1 : 0;

  const handleExportCSV = useCallback(() => {
    const headers = [
      'Styliste',
      'Période',
      'Soins Réalisés',
      'Recette Soins (DZD)',
      'Net Commission (DZD)',
      'Statut',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
    ];
    const rows = sortedPayouts.map((p) => [
      p.staffName,
      `${p.periodStart} - ${p.periodEnd}`,
      p.totalServicesCount,
      p.totalServiceRevenue,
      p.totalPayout,
      p.status,
      resolveRecordBranch(p, branchesById, currentBranch, language).name,
    ]);
    downloadCsvSafe(`atrium-salon-commissions-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [sortedPayouts, isAr, isEn, branchesById, currentBranch, language]);

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: stylistPayouts.length },
      { value: 'Pending', label: isAr ? 'معلق' : isEn ? 'Pending' : 'En attente', count: metrics.pendingCount },
      { value: 'Approved', label: isAr ? 'معتمد' : isEn ? 'Approved' : 'Approuvés', count: metrics.approvedCount },
      { value: 'Paid', label: isAr ? 'مدفوع' : isEn ? 'Paid' : 'Payés', count: metrics.paidCount },
    ],
    [isAr, isEn, stylistPayouts.length, metrics.pendingCount, metrics.approvedCount, metrics.paidCount]
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
            count: stylistPayouts.length,
          },
          ...metrics.branchOptionsWithCounts,
        ],
      },
      {
        id: 'status',
        label: isAr ? 'حالة الدفع' : isEn ? 'Status' : 'Statut',
        value: selectedStatusFilter,
        onChange: (val) => setSelectedStatusFilter(val as any),
        kind: 'segmented',
        options: statusOptions,
      },
    ],
    [isAr, isEn, branchFilter, stylistPayouts.length, metrics.branchOptionsWithCounts, selectedStatusFilter, statusOptions]
  );

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') chips.push({ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') });
    return chips;
  }, [branchFilter]);

  const columns: ColumnDefinition<StylistPayout>[] = useMemo(
    () => [
      {
        key: 'staffName',
        header: isAr ? 'المصففة والفترة' : isEn ? 'Stylist & Period' : 'Styliste & Période',
        sortable: true,
        renderCell: (payout) => (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#F3EDE7] dark:bg-[#262422] text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0">
              {payout.staffName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="text-[13.5px] font-semibold text-black dark:text-white truncate block">
                {payout.staffName}
              </span>
              <span className="text-[11px] font-mono text-black/62 dark:text-white/65 block">
                {payout.periodStart} → {payout.periodEnd}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'totalServicesCount',
        header: isAr ? 'الخدمات والمبيعات' : isEn ? 'Services & Retail' : 'Soins & Revente',
        sortable: true,
        renderCell: (payout) => (
          <div className="tabular-nums">
            <span className="text-[12.5px] font-semibold text-black dark:text-white block">
              {payout.totalServicesCount} soins ({payout.commissionRate}%)
            </span>
            <span className="text-[11px] font-mono text-black/62 dark:text-white/65 block">
              CA: {formatMoney(payout.totalServiceRevenue)}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
        sortable: true,
        renderCell: (payout) => {
          const isPaid = payout.status === 'Paid';
          const isApproved = payout.status === 'Approved';
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-semibold ${
                isPaid
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : isApproved
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPaid ? 'bg-emerald-500' : isApproved ? 'bg-blue-500' : 'bg-amber-500'
                }`}
              />
              {isPaid ? 'Payé' : isApproved ? 'Approuvé' : 'En Attente'}
            </span>
          );
        },
      },
      {
        key: 'totalPayout',
        header: isAr ? 'صافي العمولة' : isEn ? 'Net Commission' : 'Net Commission',
        sortable: true,
        renderCell: (payout) => (
          <div className="tabular-nums">
            <span className="font-mono text-[13px] font-bold text-[#d4522f] block">
              {formatMoney(payout.totalPayout)}
            </span>
            <span className="text-[11px] text-black/62 dark:text-white/65 block">
              {payout.paymentMethod ? `Via ${payout.paymentMethod}` : 'À régler'}
            </span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        sortable: true,
        renderCell: (payout) => (
          <span className="text-[12.5px] font-medium text-black/80 dark:text-white/85 truncate block">
            {resolveRecordBranch(payout, branchesById, currentBranch, language).name}
          </span>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: stylistPayouts.length > 0,
  });

  if (showSkeleton && (stylistPayouts.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.4*', minWidth: '180px' },
          { width: '1.6*', minWidth: '130px' },
          { width: '1.2*', minWidth: '110px' },
          { width: '1.3*', minWidth: '120px' },
          { width: '1.2*', minWidth: '110px' },
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
          label: isAr ? 'اعتماد العمولات' : isEn ? 'Approve Pending' : 'Valider les Commissions',
          icon: <CheckCircle2 size={15} />,
          onClick: () => {
            stylistPayouts
              .filter((p) => p.status === 'Pending')
              .forEach((p) => updateStylistPayoutStatus(p.id, 'Approved'));
            showToast?.({ type: 'success', title: 'Commissions approuvées', message: `${metrics.pendingCount} bordereaux` });
          },
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'ملخص العمولات والأرباح' : isEn ? 'Commissions & Profit Split' : 'Synthèse Financière & Commissions'}
        language={language}
        primaryCard={{
          label: isAr ? 'العمولات المدفوعة' : isEn ? 'Settled Payouts' : 'Commissions Réglées',
          badgeText: `↗ ${stylistPayouts.length} stylistes`,
          count: metrics.paidCount,
          tone: 'emerald',
          isActive: selectedStatusFilter === 'Paid',
          onToggle: () => setSelectedStatusFilter((p) => (p === 'Paid' ? 'All' : 'Paid')),
        }}
        secondaryCard={{
          label: isAr ? 'قيد الانتظار والاعتماد' : isEn ? 'Pending Approval' : 'Bordereaux en Attente',
          badgeText: `${metrics.approvedCount} approuvés`,
          count: metrics.pendingCount,
          tone: 'terracotta',
          isActive: selectedStatusFilter === 'Pending',
          onToggle: () => setSelectedStatusFilter((p) => (p === 'Pending' ? 'All' : 'Pending')),
        }}
        darkCard={{
          label: isAr ? 'مجموع العمولات المستحقة' : isEn ? 'Stylist Commissions Pool' : 'Cagnotte Commissions Stylistes',
          badgePrefix: 'Net Salon: ',
          badgeCount: metrics.netSalonProfit,
          badgeSuffix: ' DZD',
          valuePrefix: '',
          valueCount: metrics.totalCommissionsDue,
          formatValue: (n) => formatMoney(n),
          caption: `Espèces ${formatMoney(metrics.cash)} · BaridiMob ${formatMoney(metrics.baridiMob)}`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'كشوفات عمولات المصففات' : isEn ? 'Stylist Payout Slips' : 'Bordereaux de Commissions'}
          liveRegionText={`${sortedPayouts.length} bordereaux`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr ? 'بحث عن مصففة أو فرع...' : isEn ? 'Search stylist, period, branch...' : 'Rechercher styliste, période, branche...'
          }
          statusOptions={statusOptions}
          statusValue={selectedStatusFilter}
          onStatusChange={(v) => setSelectedStatusFilter(v as any)}
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

        <UniversalDataCollection<StylistPayout>
          data={sortedPayouts}
          columns={columns}
          keyExtractor={(p) => p.id}
          viewMode={viewMode}
          hideToolbar
          openItemId={inspectingPayout?.id ?? null}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(key, dir) => {
            setSortBy(key);
            setSortDir(dir);
          }}
          selectedIds={selectedPayoutIds}
          onSelectionChange={setSelectedPayoutIds}
          pinnedIds={pinnedPayoutIds}
          onPinToggle={(p: any) => {
            const id = typeof p === 'string' ? p : p.id;
            setPinnedPayoutIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onItemClick={(payout, opener) => {
            setDrawerOpenerEl(opener || null);
            setInspectingPayout(payout);
          }}
          onViewDetails={(payout, opener) => {
            setDrawerOpenerEl(opener || null);
            setInspectingPayout(payout);
          }}
          customActions={(payout) =>
            payout.status === 'Pending'
              ? [
                  {
                    id: 'approve',
                    label: 'Valider',
                    icon: <Check size={13} />,
                    onClick: () => updateStylistPayoutStatus(payout.id, 'Approved'),
                  },
                ]
              : payout.status === 'Approved'
              ? [
                  {
                    id: 'pay',
                    label: 'Régler',
                    icon: <CheckCircle2 size={13} />,
                    onClick: () => updateStylistPayoutStatus(payout.id, 'Paid', 'BaridiMob'),
                  },
                ]
              : []
          }
          emptyTitle={isAr ? 'لا توجد كشوفات' : 'Aucun bordereau trouvé'}
          emptyDescription={isAr ? 'ستظهر العمولات هنا' : 'Les commissions générées apparaîtront ici.'}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveAdvancedFilters || selectedStatusFilter !== 'All' || searchQuery.trim().length > 0}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedPayouts.length}
        entityPluralLabel={isAr ? 'كشوفات' : 'bordereaux'}
        hasActiveFilters={hasActiveAdvancedFilters}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<StylistPayout>
        isOpen={inspectingPayout !== null}
        item={inspectingPayout}
        allItems={sortedPayouts}
        keyExtractor={(p) => p.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectingPayout?.staffName || ''}
        subtitle={inspectingPayout ? `${inspectingPayout.periodStart} → ${inspectingPayout.periodEnd}` : undefined}
        avatarText={inspectingPayout ? inspectingPayout.staffName.charAt(0).toUpperCase() : undefined}
        branchName={
          inspectingPayout
            ? resolveRecordBranch(inspectingPayout, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={inspectingPayout ? localizeStatus(inspectingPayout.status, language) : undefined}
        statusClassName={
          inspectingPayout?.status === 'Paid'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : inspectingPayout?.status === 'Approved'
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }
        onClose={() => setInspectingPayout(null)}
        onSelectItem={(p) => setInspectingPayout(p)}
        renderBody={(payout) => (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex justify-between items-center">
              <div>
                <span className="text-[11px] font-semibold uppercase text-[#d4522f] block">Net Commission</span>
                <span className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums text-black dark:text-white">
                  {formatMoney(payout.totalPayout)}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] font-semibold">
                {payout.commissionRate}% soins
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">Recette Prestations :</span>
                <span className="font-bold">{formatMoney(payout.totalServiceRevenue)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Part Soins ({payout.commissionRate}%) :</span>
                <span className="font-bold">+{formatMoney(payout.commissionAmount)}</span>
              </div>
              <div className="flex justify-between text-blue-600">
                <span>Part Revente ({payout.retailCommissionRate}%) :</span>
                <span className="font-bold">+{formatMoney(payout.retailCommissionAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E6DED6] dark:border-[#3A3734]">
                <span className="text-black/62 dark:text-white/65 font-sans">Branche :</span>
                <span className="font-sans font-semibold flex items-center gap-1">
                  <Building2 size={12} className="text-[#d4522f]" />
                  {resolveRecordBranch(payout, branchesById, currentBranch, language).name}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] space-y-1.5">
              <span className="text-[11px] font-bold uppercase text-black/62 dark:text-white/65 block">
                Ventilation Caisse Salon
              </span>
              <div className="flex justify-between">
                <span>Espèces :</span>
                <span className="font-mono font-bold">{formatMoney(metrics.cash)}</span>
              </div>
              <div className="flex justify-between">
                <span>BaridiMob :</span>
                <span className="font-mono font-bold">{formatMoney(metrics.baridiMob)}</span>
              </div>
              <div className="flex justify-between">
                <span>CIB / Edahabia :</span>
                <span className="font-mono font-bold">{formatMoney(metrics.cib)}</span>
              </div>
            </div>

            <div className="space-y-2">
              {payout.status === 'Pending' && (
                <AtriumButton
                  type="button"
                  variant="primary"
                  icon={<Check size={14} />}
                  className="w-full justify-center"
                  onClick={() => {
                    updateStylistPayoutStatus(payout.id, 'Approved');
                    setInspectingPayout({ ...payout, status: 'Approved' });
                  }}
                >
                  Approuver le Bordereau
                </AtriumButton>
              )}
              {payout.status === 'Approved' && (
                <AtriumButton
                  type="button"
                  variant="primary"
                  icon={<CheckCircle2 size={14} />}
                  className="w-full justify-center"
                  onClick={() => {
                    updateStylistPayoutStatus(payout.id, 'Paid', 'BaridiMob');
                    setInspectingPayout({ ...payout, status: 'Paid', paymentMethod: 'BaridiMob' });
                  }}
                >
                  Régler via BaridiMob
                </AtriumButton>
              )}
              <AtriumButton
                type="button"
                variant="secondary"
                icon={<Printer size={14} />}
                className="w-full justify-center"
                onClick={() => window.print()}
              >
                Imprimer Bordereau
              </AtriumButton>
            </div>
          </div>
        )}
      />
    </div>
  );
});

AppointmentFinanceView.displayName = 'AppointmentFinanceView';
