import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Receipt,
  Printer,
  CheckCircle2,
  Send,
  Share2,
  Clock,
  Calculator,
  MapPin,
  Eye,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { registerUndoEntry } from '../../../services/undoEngine';
import { formatMoney } from '../../../utils/rules';
import { useRealEstateData } from './realEstateData';
import { AtriumButton } from '../../ui/AtriumButton';
import { RealEstateLease } from '../../../types';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { NotarySimulatorModal } from './NotarySimulatorModal';
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

export const RealEstateFinanceView: React.FC<any> = () => {
  const {
    language,
    currentBranch,
    branches,
    isSyncing,
    networkMode,
    retryCloudSync,
  } = useAtriumStore();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const { leases } = useRealEstateData();

  const [searchQuery, setSearchQuery] = useState('');
  const [settlementFilter, setSettlementFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>());
  const [sortBy, setSortBy] = useState<string>('rent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [isNotaryModalOpen, setIsNotaryModalOpen] = useState(false);
  const [selectedLease, setSelectedLease] = useState<RealEstateLease | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('quittance');
  const [settledBailleurIds, setSettledBailleurIds] = useState<string[]>(['lease_01']);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    leases.forEach((l) => {
      const b = resolveRecordBranch(l, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [leases, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: leases.length },
    ];
    const seen = new Set<string>();
    branches.forEach((b) => {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        opts.push({ value: b.id, label: b.name, count: branchCounts.get(b.id) || 0 });
      }
    });
    if (seen.size === 0 && currentBranch) {
      opts.push({
        value: currentBranch.id,
        label: currentBranch.name,
        count: branchCounts.get(currentBranch.id) || leases.length,
      });
    }
    return opts;
  }, [branches, currentBranch, branchCounts, leases.length, isAr, isEn]);

  const filteredFinanceLeases = useMemo(() => {
    return leases.filter((l) => {
      if (settlementFilter === 'reversements' && !settledBailleurIds.includes(l.id)) return false;
      if (settlementFilter === 'impayes' && l.status === 'Active') return false;
      if (settlementFilter === 'loyers' && l.status !== 'Active') return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(l, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const b = resolveRecordBranch(l, branchesById, currentBranch, language);
        const matches =
          l.propertyTitle.toLowerCase().includes(q) ||
          l.tenantName.toLowerCase().includes(q) ||
          (l.tenantPhone || '').toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [leases, settlementFilter, settledBailleurIds, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedFinanceLeases = useMemo(() => {
    const list = [...filteredFinanceLeases];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'rent') cmp = a.monthlyRentDzd - b.monthlyRentDzd;
      else if (sortBy === 'netOwner') cmp = a.monthlyRentDzd * 0.9 - b.monthlyRentDzd * 0.9;
      else if (sortBy === 'property') cmp = a.propertyTitle.localeCompare(b.propertyTitle);
      else if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredFinanceLeases, sortBy, sortDir, branchesById, currentBranch, language]);

  const totalMonthlyRents = useMemo(() => leases.reduce((acc, l) => acc + l.monthlyRentDzd, 0), [leases]);
  const totalCommissions = useMemo(() => leases.reduce((acc, l) => acc + l.monthlyRentDzd * 0.1, 0), [leases]);
  const netOwnerDisbursal = totalMonthlyRents - totalCommissions;

  const handlePrintQuittance = useCallback(
    (tenantName: string, propertyTitle: string) => {
      showToast(
        isAr
          ? `جاري طباعة مخالصة الإيجار للمستأجر ${tenantName}...`
          : `Impression de la quittance de loyer pour ${tenantName} (${propertyTitle})...`,
        'info'
      );
      if (typeof window !== 'undefined') window.print();
    },
    [isAr]
  );

  const handleDisburseToOwner = useCallback(
    (lease: RealEstateLease) => {
      if (!settledBailleurIds.includes(lease.id)) {
        const net = lease.monthlyRentDzd * 0.9;
        setSettledBailleurIds((prev) => (prev.includes(lease.id) ? prev : [...prev, lease.id]));
        registerUndoEntry({
          vertical: 'real_estate',
          operationType: 'status',
          branchId: currentBranch?.id || 'branch_realestate_main',
          summary: isAr
            ? `تحويل صافي الإيجار للمالك — ${lease.propertyTitle} (${formatMoney(net, language)})`
            : isEn
            ? `Owner disbursement — ${lease.propertyTitle} (${formatMoney(net, language)})`
            : `Reversement bailleur — ${lease.propertyTitle} (${formatMoney(net, language)})`,
          entityLabel: lease.propertyTitle,
          toastType: 'success',
          undo: () => {
            setSettledBailleurIds((prev) => prev.filter((id) => id !== lease.id));
          },
          redo: () => {
            setSettledBailleurIds((prev) => (prev.includes(lease.id) ? prev : [...prev, lease.id]));
          },
        });
      }
    },
    [settledBailleurIds, currentBranch?.id, isAr, isEn, language]
  );

  const handleTogglePin = useCallback((l: RealEstateLease) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(l.id)) next.delete(l.id);
      else next.add(l.id);
      return next;
    });
  }, []);

  const handleExportCsv = useCallback(() => {
    const headers = [
      'ID Bail',
      'Bien Immobilier',
      'Locataire',
      'Téléphone',
      'Agence / Branche',
      'Loyer Quittancé (DZD)',
      'Commission Agence 10% (DZD)',
      'Net Bailleur (DZD)',
      'Statut Reversement',
    ];
    const rows = sortedFinanceLeases.map((l) => {
      const b = resolveRecordBranch(l, branchesById, currentBranch, language);
      const isSettled = settledBailleurIds.includes(l.id);
      return [
        l.id,
        l.propertyTitle,
        l.tenantName,
        l.tenantPhone,
        b.name,
        l.monthlyRentDzd,
        Math.round(l.monthlyRentDzd * 0.1),
        Math.round(l.monthlyRentDzd * 0.9),
        isSettled ? 'Reversé' : 'À reverser',
      ];
    });
    downloadCsvSafe(`quittances_bailleurs_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast(isAr ? 'تم تصدير كشف التحويلات' : 'Export CSV des règlements bailleurs généré', 'info');
  }, [sortedFinanceLeases, branchesById, currentBranch, language, settledBailleurIds, isAr]);

  const activeFiltersCount = branchFilter !== 'All' ? 1 : 0;
  const hasAnyFilters = settlementFilter !== 'all' || branchFilter !== 'All' || searchQuery.trim().length > 0;

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setSettlementFilter('all');
    setBranchFilter('All');
  }, []);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (settlementFilter !== 'all') {
      chips.push({ key: 'settlement', label: settlementFilter, onRemove: () => setSettlementFilter('all') });
    }
    if (branchFilter !== 'All') {
      const bLabel = branchOptions.find((b) => b.value === branchFilter)?.label || branchFilter;
      chips.push({ key: 'branch', label: bLabel, onRemove: () => setBranchFilter('All') });
    }
    return chips;
  }, [settlementFilter, branchFilter, branchOptions]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'branch',
        label: isAr ? 'الفرع / الوكالة' : isEn ? 'Branch' : 'Agence / Branche',
        value: branchFilter,
        onChange: setBranchFilter,
        kind: 'tiles',
        columns: 2,
        options: branchOptions,
      },
    ],
    [branchFilter, branchOptions, isAr, isEn]
  );

  const columns: ColumnDefinition<RealEstateLease>[] = useMemo(
    () => [
      {
        key: 'property',
        header: isAr ? 'العقار' : 'Bien Immobilier',
        width: '2.6*',
        sortable: true,
        renderCell: (l) => (
          <div>
            <span className="font-semibold t-small text-black dark:text-white block truncate">{l.propertyTitle}</span>
            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
              Bail du {l.startDate} au {l.endDate}
            </span>
          </div>
        ),
      },
      {
        key: 'tenant',
        header: isAr ? 'المستأجر' : 'Locataire Titulaire',
        width: '1.8*',
        renderCell: (l) => (
          <div className="t-cap">
            <span className="font-semibold text-black dark:text-white block truncate">{l.tenantName}</span>
            <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">{l.tenantPhone}</span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الوكالة' : isEn ? 'Branch' : 'Agence',
        width: '1.5*',
        sortable: true,
        renderCell: (l) => {
          const b = resolveRecordBranch(l, branchesById, currentBranch, language);
          return (
            <div className="t-small font-medium text-black/75 dark:text-white/75 truncate flex items-center gap-2">
              <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'rent',
        header: isAr ? 'مبلغ الإيجار' : 'Loyer Quittancé',
        width: '1.5*',
        sortable: true,
        renderCell: (l) => <span className="tabular-nums t-small font-semibold text-black dark:text-white">{formatMoney(l.monthlyRentDzd, language)}</span>,
      },
      {
        key: 'commission',
        header: isAr ? 'عمولة الوكالة' : 'Com. (10%)',
        width: '1.3*',
        renderCell: (l) => (
          <span className="tabular-nums t-small text-blue-600 dark:text-blue-400 font-semibold">
            {formatMoney(l.monthlyRentDzd * 0.1, language)}
          </span>
        ),
      },
      {
        key: 'netOwner',
        header: isAr ? 'صافي المالك' : 'Net Bailleur',
        width: '1.5*',
        sortable: true,
        renderCell: (l) => (
          <span className="tabular-nums t-small font-semibold text-emerald-600 dark:text-emerald-400">
            {formatMoney(l.monthlyRentDzd * 0.9, language)}
          </span>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'التسوية' : 'Reversement',
        width: '1.3*',
        renderCell: (l) => {
          const isSettled = settledBailleurIds.includes(l.id);
          return (
            <span
              className={`px-2.5 py-1 rounded-full t-small font-semibold inline-flex items-center gap-1 ${
                isSettled
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}
            >
              {isSettled ? <CheckCircle2 size={11} /> : <Clock size={11} />}
              {isSettled ? (isAr ? 'تم التحويل' : 'Reversé') : isAr ? 'بانتظار التحويل' : 'À reverser'}
            </span>
          );
        },
      },
    ],
    [branchesById, currentBranch, language, settledBailleurIds, isAr, isEn]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: leases.length > 0,
  });

  if (showSkeleton && (leases.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '2*', minWidth: '140px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '1.5*', minWidth: '120px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={140}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  const activeBranchInfo = selectedLease ? resolveRecordBranch(selectedLease, branchesById, currentBranch, language) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Receipt size={22} />}
        title={isAr ? 'الوصولات' : isEn ? 'Receipts & Payouts' : 'Quittances & Bailleurs'}
        secondaryActions={
          <AtriumButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (typeof window !== 'undefined') window.print();
            }}
            icon={<Printer size={14} />}
          >
            {isAr ? 'طباعة كشف الحسابات' : 'Bordereau Bailleurs'}
          </AtriumButton>
        }
        primaryAction={{
          label: isAr ? 'حاسبة الموثق (08-243)' : 'Simulateur Notaire (08-243)',
          onClick: () => setIsNotaryModalOpen(true),
          icon: <Calculator size={15} />,
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات التحصيل وعمولات الوكالة' : 'Encaissement des Loyers & Reversements Bailleurs'}
        language={language}
        primaryCard={{
          label: isAr ? 'إجمالي الإيجارات المحصلة' : 'Masse des Loyers Appelée',
          badgeText: isAr ? `${leases.length} وصل سارٍ` : `${leases.length} baux quittancés`,
          count: totalMonthlyRents,
          formatValue: (v) => formatMoney(v, language),
          tone: 'emerald',
          isActive: settlementFilter === 'loyers',
          onToggle: () => setSettlementFilter((prev) => (prev === 'loyers' ? 'all' : 'loyers')),
        }}
        secondaryCard={{
          label: isAr ? 'عمولة التسيير (10%)' : 'Honoraires Gestion Agence',
          badgeText: isAr ? 'إيراد الوكالة' : 'Revenu agence 10%',
          count: totalCommissions,
          formatValue: (v) => formatMoney(v, language),
          tone: 'terracotta',
          isActive: settlementFilter === 'commissions',
          onToggle: () => setSettlementFilter((prev) => (prev === 'commissions' ? 'all' : 'commissions')),
        }}
        darkCard={{
          label: isAr ? 'صافي مستحقات الملاك' : 'Reversements Net Bailleurs',
          badgeCount: settledBailleurIds.length,
          badgePrefix: '',
          badgeSuffix: isAr ? ' مسوى' : ' réglés',
          valueCount: netOwnerDisbursal,
          valuePrefix: '',
          formatValue: (v) => formatMoney(v, language),
          caption: isAr ? 'صافي التحويل البنكي بعد خصم العمولة' : 'Net propriétaire après prélèvement 10%',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'سجل الوصولات ومستحقات الملاك' : 'Registre des Quittances & Règlements Bailleurs'}
          liveRegionText={`${sortedFinanceLeases.length}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث بالعقار، المستأجر...' : 'Rechercher bien, locataire, téléphone...'}
          statusOptions={[
            { value: 'all', label: isAr ? 'الكل' : 'Toutes', count: leases.length },
            { value: 'loyers', label: isAr ? 'إيجارات' : 'Loyers', count: leases.filter((l) => l.status === 'Active').length },
            { value: 'reversements', label: isAr ? 'تحويلات' : 'Reversés', count: settledBailleurIds.length },
            { value: 'impayes', label: isAr ? 'متأخرات' : 'Impayés', count: leases.filter((l) => l.status !== 'Active').length },
          ]}
          statusValue={settlementFilter}
          onStatusChange={setSettlementFilter}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExport={handleExportCsv}
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        <UniversalDataCollection
          hideToolbar
          items={sortedFinanceLeases}
          keyExtractor={(l) => l.id}
          defaultViewMode="list"
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          columns={columns}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(col, dir) => {
            setSortBy(col);
            setSortDir(dir);
          }}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          isPinned={(l) => pinnedIds.has(l.id)}
          onTogglePin={handleTogglePin}
          openItemId={selectedLease?.id}
          onItemClick={(l, el) => {
            setSelectedLease(l);
            setDrawerOpenerEl(el || null);
            setInspectorTab('quittance');
          }}
          onViewDetails={(l, el) => {
            setSelectedLease(l);
            setDrawerOpenerEl(el || null);
            setInspectorTab('quittance');
          }}
          getRowMeta={(l): Partial<KineticRowData> => {
            const bInfo = resolveRecordBranch(l, branchesById, currentBranch, language);
            const isSettled = settledBailleurIds.includes(l.id);
            return {
              title: l.propertyTitle,
              subline: `${l.tenantName} · ${l.tenantPhone}`,
              avatarText: (l.tenantName || 'QT').slice(0, 2).toUpperCase(),
              avatarColor: '#d4522f',
              categoryLabel: isAr ? 'وصل إيجار' : 'Quittance',
              branchName: bInfo.name,
              branchCode: bInfo.code,
              isPinned: pinnedIds.has(l.id),
              statusLabel: isSettled ? (isAr ? 'تم التحويل' : 'Reversé') : isAr ? 'بانتظار التحويل' : 'À reverser',
              statusVariant: isSettled ? 'active' : 'warning',
              metricPrimary: formatMoney(l.monthlyRentDzd, language),
              metricSecondary: `Net: ${formatMoney(l.monthlyRentDzd * 0.9, language)}`,
              detailCol1: { heading: isAr ? 'المستأجر' : 'Locataire', primaryText: l.tenantName },
              detailCol2: { heading: 'Com. 10%', primaryText: formatMoney(l.monthlyRentDzd * 0.1, language) },
              detailCol3: { heading: 'Net Bailleur', primaryText: formatMoney(l.monthlyRentDzd * 0.9, language) },
            };
          }}
          getFanActions={(l): KineticRowFanAction[] => {
            const isSettled = settledBailleurIds.includes(l.id);
            const list: KineticRowFanAction[] = [];
            if (!isSettled) {
              list.push({
                id: 'disburse',
                label: isAr ? 'تحويل للمالك' : 'Reverser',
                icon: <Send size={14} />,
                onClick: (e) => {
                  e.stopPropagation();
                  handleDisburseToOwner(l);
                },
              });
            }
            list.push(
              {
                id: 'print',
                label: isAr ? 'طباعة' : 'Imprimer',
                icon: <Printer size={14} />,
                onClick: (e) => {
                  e.stopPropagation();
                  handlePrintQuittance(l.tenantName, l.propertyTitle);
                },
              },
              {
                id: 'inspect',
                label: isAr ? 'عرض' : 'Détails',
                icon: <Eye size={14} />,
                onClick: (e) => {
                  e.stopPropagation();
                  setSelectedLease(l);
                  setDrawerOpenerEl(e.currentTarget);
                  setInspectorTab('quittance');
                },
              }
            );
            return list;
          }}
          getDetailActions={(l): KineticDetailAction[] => {
            const isSettled = settledBailleurIds.includes(l.id);
            return [
              ...(!isSettled
                ? [
                    {
                      id: 'disburse',
                      label: isAr ? 'تحويل للمالك' : 'Reverser Bailleur',
                      icon: <Send size={14} />,
                      onClick: () => handleDisburseToOwner(l),
                    },
                  ]
                : []),
              {
                id: 'print',
                label: isAr ? 'طباعة Quittance' : 'Imprimer Quittance',
                icon: <Printer size={14} />,
                onClick: () => handlePrintQuittance(l.tenantName, l.propertyTitle),
              },
              {
                id: 'share',
                label: isAr ? 'مشاركة الوصل' : 'Partager Reçu',
                icon: <Share2 size={14} />,
                onClick: () =>
                  showToast(
                    isAr ? `تم نسخ رابط الوصل للمستأجر ${l.tenantName}` : `Quittance électronique transmise à ${l.tenantName}`,
                    'success'
                  ),
              },
            ];
          }}
          emptyTitle={isAr ? 'لا توجد تسويات مطابقة' : 'Aucun règlement trouvé'}
          emptyDescription={isAr ? 'أعد ضبط المرشحات للعرض' : 'Réinitialisez les filtres pour afficher les quittances'}
          onResetFilters={resetAllFilters}
          hasActiveFilters={hasAnyFilters}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedFinanceLeases.length}
        entityPluralLabel={isAr ? 'وصل' : 'quittances'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => setBranchFilter('All')}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(selectedLease)}
        item={selectedLease}
        allItems={sortedFinanceLeases}
        keyExtractor={(l) => l.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={selectedLease ? `Quittance · ${selectedLease.tenantName}` : ''}
        subtitle={selectedLease?.propertyTitle}
        avatarText={(selectedLease?.tenantName || 'QT').slice(0, 2).toUpperCase()}
        avatarColor="#d4522f"
        branchName={activeBranchInfo?.name}
        statusLabel={
          selectedLease && settledBailleurIds.includes(selectedLease.id)
            ? isAr ? 'تم التحويل' : 'Reversé'
            : isAr ? 'بانتظار التحويل' : 'À reverser'
        }
        statusClassName={
          selectedLease && settledBailleurIds.includes(selectedLease.id)
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
        }
        tabs={[
          { id: 'quittance', label: isAr ? 'الوصل والرسوم' : 'Quittance' },
          { id: 'caution', label: isAr ? 'عقد الإيجار والضمان' : 'Bail & Caution' },
          { id: 'reversement', label: isAr ? 'تحويل المالك' : 'Reversement' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(l) => setSelectedLease(l)}
        onClose={() => setSelectedLease(null)}
        renderBody={(lease, tab) => {
          const isSettled = settledBailleurIds.includes(lease.id);
          return (
            <div className="space-y-4">
              <InspectorSection index={0}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'print',
                      label: isAr ? 'طباعة الوصل' : 'Imprimer',
                      icon: <Printer size={16} />,
                      primary: true,
                      onClick: () => handlePrintQuittance(lease.tenantName, lease.propertyTitle),
                    },
                    {
                      id: 'disburse',
                      label: isSettled ? 'Reversé ✓' : 'Reverser Net',
                      icon: <Send size={16} />,
                      disabled: isSettled,
                      onClick: () => handleDisburseToOwner(lease),
                    },
                    {
                      id: 'share',
                      label: isAr ? 'مشاركة' : 'Partager',
                      icon: <Share2 size={16} />,
                      onClick: () =>
                        showToast(
                          isAr ? `تم نسخ رابط الوصل للمستأجر ${lease.tenantName}` : `Quittance électronique transmise à ${lease.tenantName}`,
                          'success'
                        ),
                    },
                  ]}
                />
              </InspectorSection>

              {tab === 'quittance' && (
                <>
                  <InspectorSection index={1} title={isAr ? 'مبلغ الإيجار المحصل' : 'Loyer Mensuel Quittancé'}>
                    <InspectorBigStat
                      value={formatMoney(lease.monthlyRentDzd, language)}
                      tone="ok"
                      caption="Quittance de loyer délivrée au locataire valant décharge intégrale."
                    />
                  </InspectorSection>
                  <InspectorSection index={2} title={isAr ? 'تفصيل التوزيع' : 'Détails de Répartition'}>
                    <InspectorCard>
                      <InspectorKeyValue label="Bien loué" value={lease.propertyTitle} mono={false} />
                      <InspectorKeyValue label="Locataire" value={lease.tenantName} mono={false} />
                      <InspectorKeyValue label="Honoraires Agence (10%)" value={`-${formatMoney(lease.monthlyRentDzd * 0.1, language)}`} tone="warn" />
                      <InspectorKeyValue label="Solde Net Bailleur" value={formatMoney(lease.monthlyRentDzd * 0.9, language)} tone="ok" isLast />
                    </InspectorCard>
                  </InspectorSection>
                </>
              )}

              {tab === 'caution' && (
                <>
                  <InspectorSection index={1} title={isAr ? 'الضمان المالي' : 'Dépôt de Garantie Séquestré'}>
                    <InspectorBigStat
                      value={formatMoney(lease.securityDepositDzd, language)}
                      tone="default"
                      caption={`${lease.paymentFrequency || lease.paymentCycle} · Échéance ${lease.endDate}`}
                    />
                  </InspectorSection>
                  <InspectorSection index={2} title={isAr ? 'بيانات العقد' : 'Paramètres du Bail'}>
                    <InspectorCard>
                      <InspectorKeyValue label="Périodicité" value={lease.paymentFrequency || lease.paymentCycle} mono={false} />
                      <InspectorKeyValue label="Date d'échéance" value={lease.endDate} isLast />
                    </InspectorCard>
                  </InspectorSection>
                </>
              )}

              {tab === 'reversement' && (
                <>
                  <InspectorSection index={1} title={isAr ? 'أمر التحويل للمالك' : 'Ordre de Virement Propriétaire'}>
                    <InspectorCard>
                      <InspectorKeyValue label="Bénéficiaire" value={lease.ownerName || 'Propriétaire du bien'} mono={false} />
                      <InspectorKeyValue label="Montant Net" value={formatMoney(lease.monthlyRentDzd * 0.9, language)} tone="ok" />
                      <InspectorKeyValue label="Statut" value={isSettled ? 'Virement exécuté' : 'En attente de virement'} mono={false} tone={isSettled ? 'ok' : 'warn'} isLast />
                    </InspectorCard>
                  </InspectorSection>
                  <InspectorSection index={2}>
                    <InspectorWideButton
                      label={isSettled ? 'Virement Exécuté ✓' : 'Reverser le Net Bailleur'}
                      icon={<Send size={15} />}
                      tone="accent"
                      disabled={isSettled}
                      onClick={() => handleDisburseToOwner(lease)}
                    />
                  </InspectorSection>
                </>
              )}
            </div>
          );
        }}
      />

      <NotarySimulatorModal isOpen={isNotaryModalOpen} onClose={() => setIsNotaryModalOpen(false)} />
    </div>
  );
};
