import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  DollarSign,
  Check,
  Building2,
  Printer,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentAppointmentsFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { StylistPayout } from '../../../types/index';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
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
      { value: 'Paid', label: isAr ? 'مدفوع' : isEn ? 'Paid' : 'Payés', count: metrics.paidCount },
    ],
    [isAr, isEn, stylistPayouts.length, metrics.pendingCount, metrics.paidCount]
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
        options: [
          ...statusOptions,
          { value: 'Approved', label: isAr ? 'معتمد' : isEn ? 'Approved' : 'Approuvés', count: metrics.approvedCount },
        ],
      },
    ],
    [isAr, isEn, branchFilter, stylistPayouts.length, metrics.branchOptionsWithCounts, selectedStatusFilter, statusOptions, metrics.approvedCount]
  );

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') chips.push({ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') });
    if (selectedStatusFilter === 'Approved') {
      chips.push({ key: 'status', label: 'Approuvés', onRemove: () => setSelectedStatusFilter('All') });
    }
    return chips;
  }, [branchFilter, selectedStatusFilter]);

  const columns: ColumnDefinition<StylistPayout>[] = useMemo(
    () => [
      {
        key: 'staffName',
        header: isAr ? 'المصففة والفترة' : isEn ? 'Stylist & Period' : 'Styliste & Période',
        sortable: true,
        renderCell: (payout) => (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#F3EDE7] dark:bg-[#262422] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold t-small flex items-center justify-center shrink-0">
              {payout.staffName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="t-label font-semibold text-black dark:text-white truncate block">
                {payout.staffName}
              </span>
              <span className="t-cap tabular-nums text-black/62 dark:text-white/65 block">
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
            <span className="t-small font-semibold text-black dark:text-white block">
              {payout.totalServicesCount} soins ({payout.commissionRate}%)
            </span>
            <span className="t-cap tabular-nums text-black/62 dark:text-white/65 block">
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
              className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full t-small font-semibold ${
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
            <span className="tabular-nums t-label font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] block">
              {formatMoney(payout.totalPayout)}
            </span>
            <span className="t-cap text-black/62 dark:text-white/65 block">
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
          <span className="t-small font-medium text-black/80 dark:text-white/85 truncate block">
            {resolveRecordBranch(payout, branchesById, currentBranch, language).name}
          </span>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
  );

  const getRowMeta = useCallback(
    (payout: StylistPayout): Partial<KineticRowData> => {
      const isPaid = payout.status === 'Paid';
      const isApproved = payout.status === 'Approved';
      const branch = resolveRecordBranch(payout, branchesById, currentBranch, language);
      return {
        subline: `${payout.periodStart} → ${payout.periodEnd}`,
        categoryLabel: `${payout.commissionRate}% comm.`,
        statusLabel: isPaid ? 'Payé' : isApproved ? 'Approuvé' : 'En Attente',
        statusVariant: isPaid ? 'active' : 'warning',
        metricPrimary: formatMoney(payout.totalPayout),
        metricSecondary: `${payout.totalServicesCount} soins`,
        detailCol1: {
          heading: isAr ? 'المصففة والفرع' : isEn ? 'Stylist & Branch' : 'Styliste & Agence',
          primaryText: payout.staffName,
          secondaryText: `${payout.periodStart} → ${payout.periodEnd}`,
          tertiaryText: branch.name,
        },
        detailCol2: {
          heading: isAr ? 'إيراد الخدمات' : isEn ? 'Service Revenue' : 'Chiffre Prestations',
          primaryText: formatMoney(payout.totalServiceRevenue),
          secondaryText: `${payout.totalServicesCount} soins (${payout.commissionRate}%)`,
        },
        detailCol3: {
          heading: isAr ? 'صافي العمولة' : isEn ? 'Net Commission' : 'Règlement Net',
          primaryText: formatMoney(payout.totalPayout),
          secondaryText: payout.paymentMethod ? `Via ${payout.paymentMethod}` : 'À régler',
        },
      };
    },
    [branchesById, currentBranch, language, isAr, isEn]
  );

  const getFanActions = useCallback(
    (payout: StylistPayout): KineticRowFanAction[] => [
      ...(payout.status === 'Pending'
        ? [
            {
              id: 'approve',
              label: isAr ? 'اعتماد' : isEn ? 'Approve' : 'Valider',
              icon: <Check className="w-[15px] h-[15px]" />,
              onClick: () => updateStylistPayoutStatus(payout.id, 'Approved'),
            },
          ]
        : payout.status === 'Approved'
        ? [
            {
              id: 'pay',
              label: isAr ? 'دفع' : isEn ? 'Settle' : 'Régler',
              icon: <CheckCircle2 className="w-[15px] h-[15px]" />,
              onClick: () => updateStylistPayoutStatus(payout.id, 'Paid', 'BaridiMob'),
            },
          ]
        : []),
      {
        id: 'view',
        label: isAr ? 'معاينة' : isEn ? 'View' : 'Bordereau',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setInspectingPayout(payout);
        },
      },
    ],
    [isAr, isEn, updateStylistPayoutStatus]
  );

  const getDetailActions = useCallback(
    (payout: StylistPayout): KineticDetailAction[] => [
      {
        id: 'view',
        label: isAr ? 'معاينة' : isEn ? 'Inspect' : 'Bordereau',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => setInspectingPayout(payout),
      },
      ...(payout.status === 'Pending'
        ? [
            {
              id: 'approve',
              label: 'Valider',
              icon: <Check className="w-3.5 h-3.5 text-[#096b40]" />,
              onClick: () => updateStylistPayoutStatus(payout.id, 'Approved'),
            },
          ]
        : payout.status === 'Approved'
        ? [
            {
              id: 'pay',
              label: 'Régler',
              icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#096b40]" />,
              onClick: () => updateStylistPayoutStatus(payout.id, 'Paid', 'BaridiMob'),
            },
          ]
        : []),
    ],
    [isAr, isEn, updateStylistPayoutStatus]
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
            const pending = stylistPayouts.filter((p) => p.status === 'Pending');
            if (pending.length === 0) return;
            runUndoBatch(
              {
                vertical: 'appointment_service',
                operationType: 'bulk',
                affectedCount: pending.length,
                summary: isAr
                  ? `اعتماد العمولات (${pending.length})`
                  : isEn
                  ? `Approve commissions (${pending.length})`
                  : `Validation commissions (${pending.length})`,
              },
              () => {
                pending.forEach((p) => updateStylistPayoutStatus(p.id, 'Approved'));
              }
            );
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
          items={sortedPayouts}
          columns={columns}
          getRowMeta={getRowMeta}
          getFanActions={getFanActions}
          getDetailActions={getDetailActions}
          keyExtractor={(p) => p.id}
          viewMode={viewMode}
          hideToolbar
          openItemId={inspectingPayout?.id ?? null}
          bulkSecondaryAction={{
            label: isAr ? 'دفع الكل' : isEn ? 'Mark Paid' : 'Régler Sélection',
            icon: <CheckCircle2 size={13} />,
            onClick: (ids) => {
              if (ids.size === 0) return;
              runUndoBatch(
                {
                  vertical: 'appointment_service',
                  operationType: 'bulk',
                  affectedCount: ids.size,
                  summary: isAr
                    ? `دفع الكشوفات (${ids.size})`
                    : isEn
                    ? `Mark payouts paid (${ids.size})`
                    : `Règlement bordereaux (${ids.size})`,
                },
                () => {
                  ids.forEach((id) => updateStylistPayoutStatus(id, 'Paid', 'BaridiMob'));
                }
              );
              setSelectedPayoutIds(new Set());
            },
            variant: 'primary',
          }}
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
        avatarText={inspectingPayout ? inspectingPayout.staffName.slice(0, 2).toUpperCase() : undefined}
        categoryLabel={inspectingPayout ? `${inspectingPayout.commissionRate}% soins` : undefined}
        branchName={
          inspectingPayout
            ? resolveRecordBranch(inspectingPayout, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={inspectingPayout ? localizeStatus(inspectingPayout.status, language) : undefined}
        statusClassName={
          inspectingPayout?.status === 'Paid'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
            : inspectingPayout?.status === 'Approved'
            ? 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
        }
        tabs={[
          { id: 'overview', label: isAr ? 'العمولة' : isEn ? 'Overview' : 'Bordereau Net' },
          { id: 'breakdown', label: isAr ? 'التفاصيل' : isEn ? 'Breakdown' : 'Ventilation Soins' },
          { id: 'register', label: isAr ? 'الصندوق' : isEn ? 'Register' : 'Caisse Salon' },
        ]}
        onClose={() => setInspectingPayout(null)}
        onSelectItem={(p) => setInspectingPayout(p)}
        renderBody={(payout, activeTab) => {
          const branchName = resolveRecordBranch(payout, branchesById, currentBranch, language).name;

          if (activeTab === 'breakdown') {
            return (
              <InspectorSection index={0} title="Calcul des commissions">
                <InspectorCard>
                  <InspectorKeyValue label="Soins réalisés" value={`${payout.totalServicesCount} soins`} />
                  <InspectorKeyValue label="Recette prestations" value={formatMoney(payout.totalServiceRevenue)} />
                  <InspectorKeyValue label={`Part Soins (${payout.commissionRate}%)`} value={`+${formatMoney(payout.commissionAmount)}`} tone="ok" />
                  <InspectorKeyValue label={`Part Revente (${payout.retailCommissionRate}%)`} value={`+${formatMoney(payout.retailCommissionAmount)}`} tone="ok" isLast />
                </InspectorCard>
              </InspectorSection>
            );
          }

          if (activeTab === 'register') {
            return (
              <>
                <InspectorSection index={0} title="Ventilation Caisse Salon">
                  <InspectorCard>
                    <InspectorKeyValue label="Espèces" value={formatMoney(metrics.cash)} />
                    <InspectorKeyValue label="BaridiMob" value={formatMoney(metrics.baridiMob)} />
                    <InspectorKeyValue label="CIB / Edahabia" value={formatMoney(metrics.cib)} isLast />
                  </InspectorCard>
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label="Imprimer le bordereau"
                    icon={<Printer className="w-4 h-4" />}
                    tone="dark"
                    onClick={() => window.print()}
                  />
                </InspectorSection>
              </>
            );
          }

          return (
            <>
              <InspectorSection index={0} title="Actions rapides">
                <InspectorQuickActions
                  actions={[
                    ...(payout.status === 'Pending'
                      ? [
                          {
                            id: 'approve',
                            label: 'Approuver',
                            icon: <Check className="w-[18px] h-[18px]" />,
                            primary: true,
                            onClick: () => {
                              updateStylistPayoutStatus(payout.id, 'Approved');
                              setInspectingPayout({ ...payout, status: 'Approved' });
                            },
                          },
                        ]
                      : payout.status === 'Approved'
                      ? [
                          {
                            id: 'pay',
                            label: 'Régler BaridiMob',
                            icon: <CheckCircle2 className="w-[18px] h-[18px]" />,
                            primary: true,
                            onClick: () => {
                              updateStylistPayoutStatus(payout.id, 'Paid', 'BaridiMob');
                              setInspectingPayout({ ...payout, status: 'Paid', paymentMethod: 'BaridiMob' });
                            },
                          },
                        ]
                      : []),
                    {
                      id: 'print',
                      label: 'Imprimer',
                      icon: <Printer className="w-[18px] h-[18px]" />,
                      onClick: () => window.print(),
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title="Net à reverser">
                <InspectorBigStat
                  value={formatMoney(payout.totalPayout)}
                  tone={payout.status === 'Paid' ? 'ok' : 'accent'}
                  action={
                    payout.status === 'Pending'
                      ? {
                          label: 'Approuver le bordereau',
                          onClick: () => {
                            updateStylistPayoutStatus(payout.id, 'Approved');
                            setInspectingPayout({ ...payout, status: 'Approved' });
                          },
                        }
                      : payout.status === 'Approved'
                      ? {
                          label: 'Régler via BaridiMob',
                          onClick: () => {
                            updateStylistPayoutStatus(payout.id, 'Paid', 'BaridiMob');
                            setInspectingPayout({ ...payout, status: 'Paid', paymentMethod: 'BaridiMob' });
                          },
                        }
                      : undefined
                  }
                />
              </InspectorSection>

              <InspectorSection index={2} title="Récapitulatif">
                <InspectorCard>
                  <InspectorKeyValue label="Période" value={`${payout.periodStart} → ${payout.periodEnd}`} />
                  <InspectorKeyValue label="Recette brute" value={formatMoney(payout.totalServiceRevenue)} />
                  <InspectorKeyValue label="Mode" value={payout.paymentMethod || 'À définir'} mono={false} />
                  <InspectorKeyValue label="Branche" icon={<Building2 className="w-[15px] h-[15px]" />} value={branchName} mono={false} isLast />
                </InspectorCard>
              </InspectorSection>
            </>
          );
        }}
      />
    </div>
  );
});

AppointmentFinanceView.displayName = 'AppointmentFinanceView';
