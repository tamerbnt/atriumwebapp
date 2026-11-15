import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  X,
  Eye,
  Printer,
  Unlock,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { SecurityDepositRecord } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
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
  KineticSlideOverInspector,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const extractStr = (val: any): string =>
  typeof val === 'string' ? val : val?.target?.value ?? String(val ?? '');

export const VenueFinanceView: React.FC = () => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const {
    securityDeposits,
    rentalBookings,
    releaseSecurityDeposit,
    deductSecurityDeposit,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();

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
            <span className="font-bold text-xs text-black dark:text-white block">{d.renterName}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F3EDE7] dark:bg-neutral-800 text-black dark:text-white border border-[#E6DED6] dark:border-neutral-700 truncate">
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
          <span className="text-xs font-medium text-black/70 dark:text-white/75">{d.unitName}</span>
        ),
      },
      {
        key: 'amount',
        header: t('venue_col_financials'),
        width: '1.2*',
        minWidth: '120px',
        sortable: true,
        renderCell: (d) => (
          <span className="font-mono text-xs font-bold text-black dark:text-white tabular-nums">
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
          <span className="text-xs text-black/55 dark:text-white/55 font-medium">
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
            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
        subtitle={
          isAr
            ? 'إدارة أموال الضمان والودائع المحجوزة'
            : isFr
            ? 'Fonds séquestrés, dégradations constatées et déblocages après événement'
            : 'Escrow deposits, damage inspections, and post-event releases'
        }
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

        <UniversalDataCollection
          hideToolbar
          data={sortedDeposits}
          keyExtractor={(d) => d.id}
          viewMode={viewMode}
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
          isPinned={(d) => pinnedIds.has(d.id)}
          onPinToggle={(d) => {
            setPinnedIds((prev) => {
              const next = new Set(prev);
              if (next.has(d.id)) next.delete(d.id);
              else next.add(d.id);
              return next;
            });
          }}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          customActions={(dep) => [
            {
              id: 'inspect',
              tooltip: isAr ? 'معاينة الضمان' : 'Consulter Caution',
              icon: <Eye size={14} />,
              onClick: () => setSelectedDeposit(dep),
            },
            ...(dep.status === 'Held'
              ? [
                  {
                    id: 'release',
                    tooltip: isAr ? 'استرجاع الوديعة' : 'Restituer Caution',
                    icon: <Unlock size={14} />,
                    onClick: (e?: React.MouseEvent) => {
                      e?.stopPropagation();
                      releaseSecurityDeposit(dep.id);
                    },
                  },
                  {
                    id: 'deduct',
                    tooltip: isAr ? 'اقتطاع ضرر' : 'Retenue Dégâts',
                    icon: <AlertTriangle size={14} />,
                    onClick: (e?: React.MouseEvent) => {
                      e?.stopPropagation();
                      handleOpenDeduct(dep);
                    },
                  },
                ]
              : []),
            {
              id: 'receipt',
              tooltip: isAr ? 'وصل الضمان' : 'Reçu Caution',
              icon: <Printer size={14} />,
              onClick: (e?: React.MouseEvent) => {
                e?.stopPropagation();
                showToast({
                  type: 'info',
                  title: 'Reçu Caution',
                  message: `Reçu de séquestre caution émis pour ${dep.renterName}`,
                  category: 'rental_booking',
                });
              },
            },
          ]}
          renderCard={(d) => (
            <div className="p-4 flex flex-col justify-between h-full space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2 py-0.5 rounded">
                  {formatCurrencyAmount(d.amount, d.currency)}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    d.status === 'Held'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : d.status === 'Released'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                  }`}
                >
                  {d.status === 'Held'
                    ? 'Bloquée'
                    : d.status === 'Released'
                    ? 'Restituée'
                    : 'Retenue'}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-xs text-black dark:text-white line-clamp-1">
                  {d.renterName}
                </h4>
                <p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5">
                  {d.unitName} · {d.paymentMethod}
                </p>
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-black/55 dark:text-white/55 font-mono">
                <span>{d.collectedAt}</span>
                <span className="font-bold text-black/70 dark:text-white/75">{d.currency}</span>
              </div>
            </div>
          )}
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

      <KineticSlideOverInspector
        isOpen={Boolean(activeDeposit)}
        item={activeDeposit}
        allItems={sortedDeposits}
        keyExtractor={(d) => d.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeDeposit?.renterName || ''}
        subtitle={activeDeposit ? `${activeDeposit.unitName} · ${activeDeposit.paymentMethod}` : ''}
        avatarText={(activeDeposit?.renterName || 'C').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={
          activeDeposit
            ? resolveRecordBranch(activeDeposit, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={activeDeposit?.status}
        tabs={[
          { id: 'caution', label: isAr ? 'الضمان والوديعة' : 'Caution' },
          { id: 'degradations', label: isAr ? 'الأضرار والاقتطاع' : 'Dégradations' },
          { id: 'restitution', label: isAr ? 'تاريخ الاسترجاع' : 'Restitution' },
        ]}
        onSelectItem={(d) => setSelectedDeposit(d)}
        onClose={() => setSelectedDeposit(null)}
        renderBody={(dep, tab) => (
          <div className="space-y-4 text-xs">
            {tab === 'caution' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#1F1D1B] rounded-2xl text-white space-y-2 shadow-sm">
                  <div className="flex items-center justify-between text-white/80 text-[11px]">
                    <span>Montant Caution Sous Séquestre</span>
                    <span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {dep.status}
                    </span>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">
                    {formatCurrencyAmount(dep.amount, dep.currency)}
                  </div>
                  <p className="text-[10px] text-white/75">
                    Bloqué sur compte séquestre de l'établissement jusqu'à l'état des lieux de sortie.
                  </p>
                </div>

                <div className="p-3.5 bg-[#F3EDE7]/60 dark:bg-neutral-900/60 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                    Détails de la Réservation
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/55">Espace Loué:</span>
                    <span className="font-bold text-black dark:text-white">{dep.unitName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/55">Client / Organisateur:</span>
                    <span className="font-medium text-black dark:text-white">{dep.renterName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/55">Moyen de Caution:</span>
                    <span className="font-semibold text-black dark:text-white">{dep.paymentMethod}</span>
                  </div>
                </div>

                {dep.status === 'Held' && (
                  <div className="p-3.5 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold block text-black dark:text-white">
                        Restitution Intégrale
                      </span>
                      <span className="text-[10px] text-black/55 dark:text-white/55">
                        Après état des lieux sans dégradation
                      </span>
                    </div>
                    <AtriumButton
                      variant="primary"
                      size="sm"
                      onClick={() => releaseSecurityDeposit(dep.id)}
                    >
                      Restituer ✓
                    </AtriumButton>
                  </div>
                )}

                <AtriumButton
                  variant="secondary"
                  size="sm"
                  className="w-full justify-center"
                  icon={<Printer size={14} />}
                  onClick={() => {
                    showToast({
                      type: 'info',
                      title: 'Impression Reçu',
                      message: `Bordereau de caution imprimé pour ${dep.renterName}`,
                      category: 'rental_booking',
                    });
                  }}
                >
                  {isAr ? 'طباعة وصل الوديعة' : 'Imprimer Reçu de Caution'}
                </AtriumButton>
              </div>
            )}

            {tab === 'degradations' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-[#F3EDE7]/60 dark:bg-neutral-900/60 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                    Constat de Dégradation & Retenue
                  </span>
                  <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-black/75 dark:text-white/75">
                    {dep.deductionReason || "Aucune dégradation signalée lors de l'état des lieux."}
                  </div>
                </div>
                {dep.status === 'Held' && (
                  <div className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                    <span className="font-semibold text-amber-900 dark:text-amber-300 block">
                      Appliquer une Retenue sur Caution
                    </span>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      En cas de casse, salissures anormales ou mobilier endommagé.
                    </p>
                    <AtriumButton
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenDeduct(dep)}
                    >
                      Ouvrir Dossier Dégradation
                    </AtriumButton>
                  </div>
                )}
              </div>
            )}

            {tab === 'restitution' && (
              <div className="p-4 bg-[#F3EDE7]/60 dark:bg-neutral-900/60 rounded-2xl border border-[#E6DED6] dark:border-neutral-800 space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                  Historique des Mouvements
                </span>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Date d'encaissement:</span>
                  <span className="font-mono text-black dark:text-white">{dep.collectedAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/55 dark:text-white/55">Date de déblocage:</span>
                  <span className="font-mono text-black dark:text-white">
                    {dep.releasedAt || 'Toujours en cours'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      />

      {deductionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-md shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" />
                <h3 className="font-bold text-base text-black dark:text-white">
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
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl text-xs space-y-1">
                <div>
                  Locataire: <strong className="text-black dark:text-white">{deductionTarget.renterName}</strong>
                </div>
                <div>
                  Montant Caution:{' '}
                  <strong className="font-mono text-[#d4522f]">
                    {formatCurrencyAmount(deductionTarget.amount, deductionTarget.currency)}
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
        </div>
      )}
    </div>
  );
};
