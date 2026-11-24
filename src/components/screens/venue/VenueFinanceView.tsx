import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  X,
  Printer,
  Unlock,
} from 'lucide-react';
import {
  showToast,
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentSecurityDepositsFromState,
  selectCurrentRentalBookingsFromState,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { SecurityDepositRecord } from '../../../types/index';
import { formatCurrencyAmount, localizeStatus } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { LabelInput } from '../../ui/LabelInput';
import { AtriumButton } from '../../ui/AtriumButton';
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
  KineticModalShell,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorWideButton,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
  useRetainedModalValue,
} from '../../ui/kinetic';

const STATUS_PILL_OK =
  'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]';
const STATUS_PILL_INFO =
  'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD]';
const STATUS_PILL_DANGER =
  'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A]';

type DrawerTab = 'caution' | 'degradations' | 'restitution';

const extractStr = (val: any): string =>
  typeof val === 'string' ? val : val?.target?.value ?? String(val ?? '');

export const VenueFinanceView: React.FC = () => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const { securityDeposits, rentalBookings, currentBranch, branches, isSyncing, networkMode } = useAtriumSelector(
    (s) => ({
      securityDeposits: selectCurrentSecurityDepositsFromState(s),
      rentalBookings: selectCurrentRentalBookingsFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
    }),
    shallowEqualObjects
  );
  const { releaseSecurityDeposit, deductSecurityDeposit, retryCloudSync } = useAtriumActions();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [methodFilter, setMethodFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [deductionTarget, setDeductionTarget] = useState<SecurityDepositRecord | null>(null);
  const [deductionReason, setDeductionReason] = useState('');
  const [deductionAmount, setDeductionAmount] = useState(0);

  const [selectedDeposit, setSelectedDeposit] = useState<SecurityDepositRecord | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('caution');
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());
  const [sortBy, setSortBy] = useState<string>('collectedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    securityDeposits.forEach((d) => {
      const bName = resolveRecordBranch(d, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [securityDeposits, branchesById, currentBranch, language]);

  const activeDeposit = useMemo(() => {
    if (!selectedDeposit) return null;
    return securityDeposits.find((d) => d.id === selectedDeposit.id) || null;
  }, [selectedDeposit, securityDeposits]);

  const totalHeldCount = securityDeposits.filter((d) => d.status === 'Held').length;
  const totalHeld = securityDeposits
    .filter((d) => d.status === 'Held')
    .reduce((sum, d) => sum + d.amount, 0);
  const totalReleased = securityDeposits
    .filter((d) => d.status === 'Released')
    .reduce((sum, d) => sum + d.amount, 0);
  const totalBookingRevenue = rentalBookings.reduce((sum, b) => sum + b.totalAmount, 0);

  const filteredDeposits = useMemo(() => {
    return securityDeposits.filter((d) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(d, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (statusFilter !== 'All' && d.status !== statusFilter) return false;
      if (methodFilter !== 'All' && d.paymentMethod !== methodFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          d.renterName.toLowerCase().includes(q) ||
          d.unitName.toLowerCase().includes(q) ||
          (d.deductionReason || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [
    securityDeposits,
    branchFilter,
    statusFilter,
    methodFilter,
    searchQuery,
    branchesById,
    currentBranch,
    language,
  ]);

  const sortedDeposits = useMemo(() => {
    return [...filteredDeposits].sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (sortBy === 'renter') {
        const cmp = a.renterName.localeCompare(b.renterName);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'branch') {
        const cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'unit') {
        const cmp = a.unitName.localeCompare(b.unitName);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'amount') {
        return sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      if (sortBy === 'collectedAt') {
        const cmp = a.collectedAt.localeCompare(b.collectedAt);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredDeposits, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleOpenDeduct = useCallback((dep: SecurityDepositRecord) => {
    setDeductionTarget(dep);
    setDeductionAmount(dep.amount);
    setDeductionReason('');
  }, []);

  const handleConfirmDeduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductionTarget || !deductionReason.trim()) return;
    deductSecurityDeposit(deductionTarget.id, deductionReason.trim(), deductionAmount);
    setDeductionTarget(null);
  };

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('All');
    setBranchFilter('All');
    setMethodFilter('All');
  }, []);

  const activeFiltersCount =
    (branchFilter !== 'All' ? 1 : 0) +
    (statusFilter !== 'All' ? 1 : 0) +
    (methodFilter !== 'All' ? 1 : 0);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (statusFilter !== 'All') {
      chips.push({
        key: 'status',
        label: `${t('venue_col_status')}: ${statusFilter}`,
        onRemove: () => setStatusFilter('All'),
      });
    }
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (methodFilter !== 'All') {
      chips.push({
        key: 'method',
        label: `${isAr ? 'الطريقة' : isFr ? 'Mode' : 'Method'}: ${methodFilter}`,
        onRemove: () => setMethodFilter('All'),
      });
    }
    return chips;
  }, [statusFilter, branchFilter, methodFilter, t, isAr, isFr]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'branch',
        label: isAr ? 'الفرع / المرفق' : isFr ? 'Branche / Complexe' : 'Branch / Facility',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          {
            value: 'All',
            label: isAr ? 'كل الفروع' : isFr ? 'Toutes les branches' : 'All Branches',
            count: securityDeposits.length,
          },
          ...Array.from(branchCounts.entries()).map(([bName, count]) => ({
            value: bName,
            label: bName,
            count,
          })),
        ],
      },
      {
        id: 'status',
        label: t('venue_col_status'),
        value: statusFilter,
        onChange: setStatusFilter,
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : isFr ? 'Toutes' : 'All' },
          { value: 'Held', label: isAr ? 'محجوزة' : isFr ? 'Bloquées' : 'Held' },
          { value: 'Released', label: isAr ? 'مستردة' : isFr ? 'Restituées' : 'Released' },
          { value: 'Deducted', label: isAr ? 'مقتطعة' : isFr ? 'Déduites' : 'Deducted' },
        ],
      },
      {
        id: 'method',
        label: isAr ? 'طريقة الدفع' : isFr ? 'Mode de paiement' : 'Payment Method',
        value: methodFilter,
        onChange: setMethodFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'الكل' : isFr ? 'Tous' : 'All' },
          ...Array.from(new Set(securityDeposits.map((d) => d.paymentMethod).filter(Boolean))).map(
            (m) => ({
              value: m,
              label: m,
            })
          ),
        ],
      },
    ],
    [isAr, isFr, branchFilter, securityDeposits, branchCounts, t, statusFilter, methodFilter]
  );

  const handleExportCautionCSV = useCallback(() => {
    if (sortedDeposits.length === 0) {
      showToast({
        type: 'warning',
        title: 'CSV Export',
        message: 'No security deposit records to export.',
        category: 'rental_booking',
      });
      return;
    }
    const headers = [
      'Deposit ID',
      isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
      'Booking ID',
      'Renter Name',
      'Space / Unit',
      'Amount',
      'Currency',
      'Payment Method',
      'Status',
      'Retention Reason',
      'Collected Date',
      'Released Date',
    ];
    const rows = sortedDeposits.map((dep) => [
      dep.id,
      resolveRecordBranch(dep, branchesById, currentBranch, language).name,
      dep.bookingId,
      dep.renterName,
      dep.unitName,
      dep.amount,
      dep.currency,
      dep.paymentMethod,
      dep.status,
      dep.deductionReason || '',
      dep.collectedAt,
      dep.releasedAt || '',
    ]);
    downloadCsvSafe(
      `atrium_caution_escrow_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
    showToast({
      type: 'success',
      title: 'CSV Exported',
      message: `${sortedDeposits.length} caution deposits exported successfully.`,
      category: 'rental_booking',
    });
  }, [sortedDeposits, branchesById, currentBranch, language, isAr, isFr]);

  const depositColumns: ColumnDefinition<SecurityDepositRecord>[] = useMemo(
    () => [
      {
        key: 'renter',
        header: t('venue_voucher_renter_name'),
        width: '2*',
        minWidth: '180px',
        sortable: true,
        renderCell: (d) => (
          <div>
            <span className="font-semibold t-small text-black dark:text-white block">{d.renterName}</span>
            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
              {d.collectedAt}
            </span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        width: '1.3*',
        minWidth: '125px',
        sortable: true,
        renderCell: (d) => {
          const bInfo = resolveRecordBranch(d, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[var(--r-check,6px)] t-small font-medium bg-[#F3EDE7] dark:bg-[#2B2825] text-black dark:text-white truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              {bInfo.name}
            </span>
          );
        },
      },
      {
        key: 'unit',
        header: t('venue_voucher_space'),
        width: '1.5*',
        minWidth: '150px',
        sortable: true,
        renderCell: (d) => (
          <span className="t-small font-medium text-black/70 dark:text-white/75">{d.unitName}</span>
        ),
      },
      {
        key: 'amount',
        header: t('venue_col_financials'),
        width: '1.2*',
        minWidth: '120px',
        sortable: true,
        renderCell: (d) => (
          <span className="tabular-nums t-small font-semibold text-black dark:text-white">
            {formatCurrencyAmount(d.amount, d.currency)}
          </span>
        ),
      },
      {
        key: 'method',
        header: isAr ? 'طريقة الدفع' : 'Mode Paiement',
        width: '1.1*',
        minWidth: '110px',
        renderCell: (d) => (
          <span className="t-small text-black/55 dark:text-white/55 font-medium">
            {d.paymentMethod}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('venue_col_status'),
        width: '1.1*',
        minWidth: '110px',
        renderCell: (d) => (
          <span
            className={`inline-block px-2.5 py-1 rounded-full t-small font-semibold ${
              d.status === 'Held'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : d.status === 'Released'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300'
            }`}
          >
            {d.status === 'Held'
              ? t('venue_held_status')
              : d.status === 'Released'
              ? t('venue_refunded_status')
              : t('venue_deducted_status')}
          </span>
        ),
      },
    ],
    [t, isAr, isFr, branchesById, currentBranch, language]
  );

  const retainedDeductionTarget = useRetainedModalValue(deductionTarget);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: securityDeposits.length > 0,
  });

  if (showSkeleton && (securityDeposits.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.3*', minWidth: '180px' },
          { width: '1.8*', minWidth: '150px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn={false}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ScreenHeaderBar
        icon={<ShieldCheck size={22} />}
        title={t('venue_fin_page_title')}
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'الودائع الضامنة & سيولة الحسابات'
            : isFr
            ? 'Trésorerie & Séquestre des Cautions'
            : 'Treasury & Security Deposit Escrow'
        }
        language={language}
        primaryCard={{
          label: t('venue_fin_kpi_escrow'),
          badgeText: `${totalHeldCount} ${isAr ? 'ودائع محجوزة' : isFr ? 'cautions actives' : 'active held'}`,
          count: totalHeld,
          formatValue: (v) => formatCurrencyAmount(v, 'DZD'),
          tone: 'emerald',
          isActive: statusFilter === 'Held',
          onToggle: () => setStatusFilter((prev) => (prev === 'Held' ? 'All' : 'Held')),
        }}
        secondaryCard={{
          label: t('venue_fin_kpi_released'),
          badgeText: isAr ? 'مستردة بالكامل' : 'Restitué',
          count: totalReleased,
          formatValue: (v) => formatCurrencyAmount(v, 'DZD'),
          tone: 'terracotta',
          isActive: statusFilter === 'Released',
          onToggle: () =>
            setStatusFilter((prev) => (prev === 'Released' ? 'All' : 'Released')),
        }}
        darkCard={{
          label: t('venue_fin_kpi_gross_rev'),
          badgeCount: rentalBookings.length,
          badgePrefix: '',
          badgeSuffix: isAr ? 'عقود' : 'dossiers',
          valueCount: totalBookingRevenue,
          valuePrefix: '',
          formatValue: (v) => formatCurrencyAmount(v, 'DZD'),
          caption: currentBranch?.name || (isFr ? 'Complexe Principal' : 'Main Complex'),
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={
            isAr
              ? 'سجل الودائع الضامنة'
              : isFr
              ? "Registre des Cautions & Séquestres d'Événements"
              : 'Security Deposit Escrow Register'
          }
          liveRegionText={`${sortedDeposits.length}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('venue_fin_search_ph')}
          statusOptions={[
            {
              value: 'All',
              label: isAr ? 'الكل' : isFr ? 'Toutes' : 'All',
              count: securityDeposits.length,
            },
            {
              value: 'Held',
              label: isAr ? 'محجوزة' : isFr ? 'Bloquées' : 'Held',
              count: totalHeldCount,
            },
            {
              value: 'Released',
              label: isAr ? 'مستردة' : isFr ? 'Restituées' : 'Released',
              count: securityDeposits.filter((d) => d.status === 'Released').length,
            },
            {
              value: 'Deducted',
              label: isAr ? 'مقتطعة' : isFr ? 'Déduites' : 'Deducted',
              count: securityDeposits.filter((d) => d.status === 'Deducted').length,
            },
          ]}
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={(m: 'list' | 'grid' | 'calendar') => {
            if (m === 'list' || m === 'grid') setViewMode(m);
          }}
          showViewToggle
          onExport={handleExportCautionCSV}
          activeChips={activeChips}
          onResetAllFilters={handleResetFilters}
        />

        <UniversalDataCollection<SecurityDepositRecord>
          hideToolbar
          items={sortedDeposits}
          keyExtractor={(d) => d.id}
          viewMode={viewMode}
          defaultViewMode="list"
          columns={depositColumns}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(key, dir) => {
            setSortBy(key);
            setSortDir(dir);
          }}
          openItemId={activeDeposit?.id || null}
          onItemClick={(d, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedDeposit(d);
          }}
          onViewDetails={(d, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedDeposit(d);
          }}
          pinnedIds={pinnedIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          getRowMeta={(dep) => {
            const bInfo = resolveRecordBranch(dep, branchesById, currentBranch, language);
            const statusText =
              dep.status === 'Held'
                ? t('venue_held_status')
                : dep.status === 'Released'
                ? t('venue_refunded_status')
                : t('venue_deducted_status');
            return {
              title: dep.renterName,
              subline: `${dep.unitName} · ${dep.collectedAt}`,
              avatarText: (dep.renterName || 'CA').slice(0, 2).toUpperCase(),
              avatarColor: '#d4522f',
              categoryLabel: dep.paymentMethod,
              statusLabel: statusText,
              statusVariant:
                dep.status === 'Held'
                  ? 'active'
                  : dep.status === 'Released'
                  ? 'info'
                  : 'blocked',
              metricPrimary: formatCurrencyAmount(dep.amount, dep.currency),
              metricSecondary: dep.paymentMethod,
              branchName: bInfo.name,
              isPinned: pinnedIds.has(dep.id),
              detailCol1: { heading: t('venue_voucher_space'), primaryText: dep.unitName },
              detailCol2: {
                heading: isAr ? 'طريقة الدفع' : 'Mode Paiement',
                primaryText: dep.paymentMethod,
              },
              detailCol3: {
                heading: isAr ? 'تاريخ التحصيل' : 'Encaissement',
                primaryText: dep.collectedAt,
              },
            };
          }}
          getFanActions={(dep) => [
            ...(dep.status === 'Held'
              ? [
                  {
                    id: 'release',
                    label: isAr ? 'استرجاع' : 'Restituer',
                    icon: <Unlock size={14} />,
                    onClick: () => releaseSecurityDeposit(dep.id),
                  },
                  {
                    id: 'deduct',
                    label: isAr ? 'اقتطاع' : 'Retenue',
                    icon: <AlertTriangle size={14} />,
                    isDanger: true,
                    onClick: () => handleOpenDeduct(dep),
                  },
                ]
              : []),
            {
              id: 'receipt',
              label: isAr ? 'وصل' : 'Reçu',
              icon: <Printer size={14} />,
              onClick: () => {
                showToast({
                  type: 'info',
                  title: 'Reçu Caution',
                  message: `Reçu de séquestre caution émis pour ${dep.renterName}`,
                  category: 'rental_booking',
                });
              },
            },
          ]}
          getDetailActions={(dep) => [
            ...(dep.status === 'Held'
              ? [
                  {
                    id: 'release',
                    label: isAr ? 'استرجاع الوديعة' : 'Restituer',
                    icon: <Unlock size={13} />,
                    onClick: () => releaseSecurityDeposit(dep.id),
                  },
                  {
                    id: 'deduct',
                    label: isAr ? 'اقتطاع ضرر' : 'Retenue',
                    icon: <AlertTriangle size={13} />,
                    onClick: () => handleOpenDeduct(dep),
                  },
                ]
              : []),
            {
              id: 'receipt',
              label: isAr ? 'وصل الضمان' : 'Reçu Caution',
              icon: <Printer size={13} />,
              onClick: () => {
                showToast({
                  type: 'info',
                  title: 'Reçu Caution',
                  message: `Reçu de séquestre caution émis pour ${dep.renterName}`,
                  category: 'rental_booking',
                });
              },
            },
          ]}
          emptyTitle={isAr ? 'لا توجد ودائع' : isFr ? 'Aucune caution trouvée' : 'No deposits found'}
          hasActiveFilters={activeFiltersCount > 0 || searchQuery.trim().length > 0}
          onResetFilters={handleResetFilters}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedDeposits.length}
        entityPluralLabel={isAr ? 'ودائع' : isFr ? 'cautions' : 'deposits'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<SecurityDepositRecord>
        isOpen={Boolean(activeDeposit)}
        item={activeDeposit}
        allItems={sortedDeposits}
        keyExtractor={(d) => d.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeDeposit?.renterName || ''}
        subtitle={activeDeposit ? `${activeDeposit.unitName} · ${activeDeposit.paymentMethod}` : ''}
        avatarText={(activeDeposit?.renterName || 'CA').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeDeposit
            ? resolveRecordBranch(activeDeposit, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={activeDeposit ? localizeStatus(activeDeposit.status, language) : undefined}
        statusClassName={
          activeDeposit?.status === 'Held'
            ? STATUS_PILL_OK
            : activeDeposit?.status === 'Released'
            ? STATUS_PILL_INFO
            : STATUS_PILL_DANGER
        }
        tabs={[
          { id: 'caution', label: isAr ? 'الضمان والوديعة' : 'Caution' },
          { id: 'degradations', label: isAr ? 'الأضرار والاقتطاع' : 'Dégradations' },
          { id: 'restitution', label: isAr ? 'تاريخ الاسترجاع' : 'Restitution' },
        ]}
        activeTab={drawerTab}
        onTabChange={(tab) => setDrawerTab(tab as DrawerTab)}
        onSelectItem={(d) => setSelectedDeposit(d)}
        onClose={() => setSelectedDeposit(null)}
        renderBody={(dep, tab) => {
          if (tab === 'degradations') {
            return (
              <div className="space-y-4">
                <InspectorSection
                  index={0}
                  title={isAr ? 'تقرير الأضرار والاقتطاع' : 'Constat de dégradation'}
                >
                  <InspectorCard>
                    <InspectorKeyValue
                      label={isAr ? 'حالة الضمان' : 'Statut'}
                      value={localizeStatus(dep.status, language)}
                      tone={
                        dep.status === 'Held'
                          ? 'ok'
                          : dep.status === 'Released'
                          ? 'default'
                          : 'danger'
                      }
                    />
                    <InspectorKeyValue
                      label={isAr ? 'ملاحظات المعاينة' : 'Motif constaté'}
                      value={
                        dep.deductionReason ||
                        (isAr
                          ? 'لم تُسجّل أي أضرار عند معاينة الخروج.'
                          : "Aucune dégradation signalée lors de l'état des lieux.")
                      }
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>

                {dep.status === 'Held' && (
                  <InspectorSection index={1} title={isAr ? 'إجراء الاقتطاع' : 'Retenue sur caution'}>
                    <InspectorWideButton
                      label={
                        isAr ? 'فتح ملف اقتطاع الأضرار' : 'Ouvrir Dossier Dégradation'
                      }
                      icon={<AlertTriangle size={14} />}
                      tone="accent"
                      onClick={() => handleOpenDeduct(dep)}
                    />
                  </InspectorSection>
                )}
              </div>
            );
          }

          if (tab === 'restitution') {
            return (
              <div className="space-y-4">
                <InspectorSection
                  index={0}
                  title={isAr ? 'سجل حركات الوديعة' : 'Historique des mouvements'}
                >
                  <InspectorCard>
                    <InspectorKeyValue
                      label={isAr ? 'تاريخ التحصيل' : "Date d'encaissement"}
                      value={dep.collectedAt}
                      mono
                    />
                    <InspectorKeyValue
                      label={isAr ? 'تاريخ الاسترجاع' : 'Date de déblocage'}
                      value={dep.releasedAt || (isAr ? 'قيد الحجز' : 'Toujours en cours')}
                      mono
                    />
                    <InspectorKeyValue
                      label={isAr ? 'مرجع الحجز' : 'Réf. réservation'}
                      value={dep.bookingId}
                      mono
                      copyText={dep.bookingId}
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              <InspectorQuickActions
                actions={[
                  ...(dep.status === 'Held'
                    ? [
                        {
                          id: 'release',
                          label: isAr ? 'استرجاع الوديعة' : 'Restituer',
                          icon: <Unlock size={15} />,
                          primary: true,
                          onClick: () => releaseSecurityDeposit(dep.id),
                        },
                        {
                          id: 'deduct',
                          label: isAr ? 'اقتطاع' : 'Retenue',
                          icon: <AlertTriangle size={15} />,
                          onClick: () => handleOpenDeduct(dep),
                        },
                      ]
                    : []),
                  {
                    id: 'receipt',
                    label: isAr ? 'وصل الضمان' : 'Reçu',
                    icon: <Printer size={15} />,
                    primary: dep.status !== 'Held',
                    onClick: () => {
                      showToast({
                        type: 'info',
                        title: 'Impression Reçu',
                        message: `Bordereau de caution imprimé pour ${dep.renterName}`,
                        category: 'rental_booking',
                      });
                    },
                  },
                ]}
              />

              <InspectorSection index={0} title={isAr ? 'مبلغ الضمان' : 'Caution sous séquestre'}>
                <InspectorBigStat
                  value={formatCurrencyAmount(dep.amount, dep.currency)}
                  tone={dep.status === 'Held' ? 'ok' : dep.status === 'Deducted' ? 'danger' : 'accent'}
                  caption={
                    isAr
                      ? 'محتجز على حساب الضمان حتى معاينة الخروج'
                      : "Séquestre maintenu jusqu'à l'état des lieux de sortie"
                  }
                />
                <InspectorCard>
                  <InspectorKeyValue label={t('venue_voucher_space')} value={dep.unitName} />
                  <InspectorKeyValue
                    label={t('venue_voucher_renter_name')}
                    value={dep.renterName}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'طريقة الدفع' : 'Moyen de caution'}
                    value={dep.paymentMethod}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>

              <InspectorWideButton
                label={isAr ? 'طباعة وصل الوديعة' : 'Imprimer Reçu de Caution'}
                icon={<Printer size={14} />}
                tone="neutral"
                onClick={() => {
                  showToast({
                    type: 'info',
                    title: 'Impression Reçu',
                    message: `Bordereau de caution imprimé pour ${dep.renterName}`,
                    category: 'rental_booking',
                  });
                }}
              />
            </div>
          );
        }}
      />

      <KineticModalShell
        isOpen={Boolean(deductionTarget)}
        onClose={() => setDeductionTarget(null)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
      >
        {retainedDeductionTarget && (
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 w-full space-y-5 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" />
                <h3 className="font-semibold t-card text-black dark:text-white">
                  {t('venue_deduct_modal_title')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeductionTarget(null)}
                className="text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmDeduct} className="space-y-4">
              <div
                data-sq="ctl"
                data-sq-border="none"
                className="p-3 bg-[#F5F1EC] dark:bg-[#22201E] t-cap space-y-1"
              >
                <div>
                  Locataire: <strong className="text-black dark:text-white">{retainedDeductionTarget.renterName}</strong>
                </div>
                <div>
                  Montant Caution:{' '}
                  <strong className="tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                    {formatCurrencyAmount(retainedDeductionTarget.amount, retainedDeductionTarget.currency)}
                  </strong>
                </div>
              </div>
              <LabelInput
                label="Montant à Retenir (DZD)"
                type="number"
                value={deductionAmount.toString()}
                onChange={(v) => setDeductionAmount(parseFloat(extractStr(v)) || 0)}
                required
              />
              <LabelInput
                label="Motif des Dégradations / Réparations"
                value={deductionReason}
                onChange={(v) => setDeductionReason(extractStr(v))}
                placeholder="Ex: Nettoyage spécifique moquette, serrure cassée..."
                required
              />
              <div className="flex justify-end gap-2 pt-2">
                <AtriumButton variant="secondary" onClick={() => setDeductionTarget(null)}>
                  {t('venue_action_cancel')}
                </AtriumButton>
                <AtriumButton variant="primary" type="submit">
                  {t('venue_action_confirm_deduct')}
                </AtriumButton>
              </div>
            </form>
          </div>
        )}
      </KineticModalShell>
    </div>
  );
};
