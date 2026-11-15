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
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
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
        setSettledBailleurIds((prev) => [...prev, lease.id]);
        const net = lease.monthlyRentDzd * 0.9;
        showToast(
          isAr
            ? `تم تحويل صافي الإيجار (${formatMoney(net, language)}) للمالك بنجاح`
            : `Reversement du net bailleur (${formatMoney(net, language)}) confirmé`,
          'success'
        );
      }
    },
    [settledBailleurIds, isAr, language]
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
            <span className="font-bold text-xs text-black dark:text-white block truncate">{l.propertyTitle}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">
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
          <div className="text-xs">
            <span className="font-semibold text-black dark:text-white block truncate">{l.tenantName}</span>
            <span className="text-[10px] text-black/55 dark:text-white/55 font-mono">{l.tenantPhone}</span>
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
            <div className="text-xs font-medium text-black/75 dark:text-white/75 truncate flex items-center gap-1.5">
              <MapPin size={12} className="text-[#d4522f] shrink-0" />
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
        renderCell: (l) => <span className="font-mono text-xs font-bold text-black dark:text-white">{formatMoney(l.monthlyRentDzd, language)}</span>,
      },
      {
        key: 'commission',
        header: isAr ? 'عمولة الوكالة' : 'Com. (10%)',
        width: '1.3*',
        renderCell: (l) => (
          <span className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">
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
          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
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
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
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
        subtitle={
          isAr
            ? `التحصيل الشهري والتسوية القانونية للرسوم (08-243)`
            : `Gestion des encaissements, honoraires 10% & reversements bailleurs`
        }
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
          data={sortedFinanceLeases}
          keyExtractor={(l) => l.id}
          defaultViewMode={viewMode}
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
          }}
          customActions={(l) => {
            const isSettled = settledBailleurIds.includes(l.id);
            return [
              ...(!isSettled
                ? [
                    {
                      id: 'disburse',
                      label: isAr ? 'تحويل للمالك' : 'Reverser Bailleur',
                      icon: <Send size={14} />,
                      variant: 'primary' as const,
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
          renderCard={(l) => {
            const isSettled = settledBailleurIds.includes(l.id);
            return (
              <div className="p-1 flex flex-col justify-between h-full space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2 py-0.5 rounded">
                    {formatMoney(l.monthlyRentDzd, language)}/mois
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSettled
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {isSettled ? 'Reversé' : 'À reverser'}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-black dark:text-white line-clamp-2">{l.propertyTitle}</h4>
                  <p className="text-[11px] text-black/55 dark:text-white/55 mt-0.5">Locataire: {l.tenantName}</p>
                </div>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-black/55 dark:text-white/55 block">Com. Agence</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                      {formatMoney(l.monthlyRentDzd * 0.1, language)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-black/55 dark:text-white/55 block">Net Bailleur</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatMoney(l.monthlyRentDzd * 0.9, language)}
                    </span>
                  </div>
                </div>
              </div>
            );
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
        avatarText="QT"
        branchName={activeBranchInfo?.name}
        statusLabel={
          selectedLease && settledBailleurIds.includes(selectedLease.id)
            ? isAr ? 'تم التحويل' : 'Reversé'
            : isAr ? 'بانتظار التحويل' : 'À reverser'
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
        renderBody={(lease, tab) => (
          <div className="space-y-4 text-xs">
            <AtriumButton
              type="button"
              variant="primary"
              size="sm"
              className="w-full justify-center"
              icon={<Printer size={14} />}
              onClick={() => handlePrintQuittance(lease.tenantName, lease.propertyTitle)}
            >
              {isAr ? 'طباعة مخالصة الإيجار' : 'Imprimer Quittance de Loyer'}
            </AtriumButton>

            {tab === 'quittance' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#1F1D1B] rounded-xl text-white space-y-2 shadow-sm">
                  <div className="flex items-center justify-between text-white/80 text-[11px]">
                    <span>Loyer Mensuel Net Quittancé</span>
                    <span className="bg-[#3D2817] text-[#FB923C] text-[10px] font-bold px-2 py-0.5 rounded-full">Acquitté</span>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums">
                    {formatMoney(lease.monthlyRentDzd, language)}
                  </div>
                  <p className="text-[10px] text-white/75">
                    Quittance de loyer délivrée au locataire valant décharge intégrale pour la période en cours.
                  </p>
                </div>

                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                    Détails de la Quittance
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/55">Bien loué:</span>
                    <span className="font-bold text-black dark:text-white truncate max-w-[230px]">{lease.propertyTitle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/55">Locataire:</span>
                    <span className="font-medium text-black dark:text-white">{lease.tenantName}</span>
                  </div>
                  <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                    <span>Honoraires Agence (10%):</span>
                    <span className="font-mono font-semibold">-{formatMoney(lease.monthlyRentDzd * 0.1, language)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-neutral-200 dark:border-neutral-800">
                    <span className="font-bold text-black dark:text-white">Solde Net Bailleur:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(lease.monthlyRentDzd * 0.9, language)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'caution' && (
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                  Dépôt de Garantie Séquestré
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-black/55 dark:text-white/55">Montant Caution:</span>
                  <span className="font-mono font-bold text-base text-black dark:text-white">
                    {formatMoney(lease.securityDepositDzd, language)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-black/55 dark:text-white/55">
                  <span>Périodicité paiement:</span>
                  <span className="font-semibold text-black dark:text-white">{lease.paymentFrequency || lease.paymentCycle}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-black/55 dark:text-white/55">
                  <span>Date d&apos;échéance bail:</span>
                  <span className="font-mono">{lease.endDate}</span>
                </div>
              </div>
            )}

            {tab === 'reversement' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-black/55 dark:text-white/55 font-semibold block">
                    Ordre de Virement Propriétaire
                  </span>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Bénéficiaire:</span>
                    <span className="font-bold text-black dark:text-white">{lease.ownerName || 'Propriétaire du bien'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-black/55 dark:text-white/55">Montant Net:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(lease.monthlyRentDzd * 0.9, language)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-black dark:text-white">Validation Virement</span>
                    <span className="text-[10px] text-black/55 dark:text-white/55">
                      {settledBailleurIds.includes(lease.id) ? 'Virement déjà exécuté' : 'Transférer sur compte bancaire'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDisburseToOwner(lease)}
                    disabled={settledBailleurIds.includes(lease.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d4522f] hover:bg-[#b06a4e] text-white disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {settledBailleurIds.includes(lease.id) ? 'Reversé ✓' : 'Reverser Net'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      />

      <NotarySimulatorModal isOpen={isNotaryModalOpen} onClose={() => setIsNotaryModalOpen(false)} />
    </div>
  );
};
