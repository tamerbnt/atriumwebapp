import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Key,
  Plus,
  Pin,
  FileText,
  ArrowRight,
  MapPin,
  Eye,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { formatMoney } from '../../../utils/rules';
import { RealEstateLease } from '../../../types';
import { useRealEstateData } from './realEstateData';
import { RealEstateLeaseModal } from './RealEstateLeaseModal';
import { QuittanceModal } from './QuittanceModal';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { EmptyState } from '../../../atrium/components/EmptyState';
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
  InspectorListItem,
  InspectorNotesField,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  KineticEmptyStateMotion,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const RealEstateLeasesView: React.FC<any> = () => {
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

  const { leases, properties, quittances, addLease, updateLease, deleteLease, addQuittance } = useRealEstateData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['lease_01']));
  const [sortBy, setSortBy] = useState<string>('propertyTitle');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  const [isQuittanceModalOpen, setIsQuittanceModalOpen] = useState(false);
  const [leaseForQuittance, setLeaseForQuittance] = useState<RealEstateLease | null>(null);

  const [selectedLease, setSelectedLease] = useState<RealEstateLease | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('bail');
  const [inspectorNotes, setInspectorNotes] = useState('');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeLease = useMemo(() => {
    if (!selectedLease) return null;
    return leases.find((l) => l.id === selectedLease.id) || selectedLease;
  }, [selectedLease, leases]);

  const leaseCounts = useMemo(
    () => ({
      all: leases.length,
      active: leases.filter((l) => l.status === 'Active').length,
      renew: leases.filter((l) => {
        const end = new Date(l.endDate).getTime();
        const diffDays = Math.ceil((end - Date.now()) / 864e5);
        return diffDays <= 30 && diffDays >= 0;
      }).length,
      terminated: leases.filter((l) => l.status === 'Terminated').length,
      caution: leases.filter((l) => l.securityDepositDzd > 0).length,
    }),
    [leases]
  );

  const totalDeposits = useMemo(() => leases.reduce((acc, l) => acc + l.securityDepositDzd, 0), [leases]);
  const totalMonthlyRent = useMemo(
    () => leases.filter((l) => l.status === 'Active').reduce((acc, l) => acc + l.monthlyRentDzd, 0),
    [leases]
  );

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

  const filteredLeases = useMemo(() => {
    return leases.filter((l) => {
      if (statusFilter === 'Renew') {
        const end = new Date(l.endDate).getTime();
        const diffDays = Math.ceil((end - Date.now()) / 864e5);
        if (diffDays > 30 || diffDays < 0) return false;
      } else if (statusFilter === 'Caution') {
        if (l.securityDepositDzd <= 0) return false;
      } else if (statusFilter !== 'All' && l.status !== statusFilter) {
        return false;
      }
      if (frequencyFilter !== 'All' && (l.paymentFrequency || l.paymentCycle) !== frequencyFilter) return false;
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
          l.tenantPhone.toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [leases, statusFilter, frequencyFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedLeases = useMemo(() => {
    const list = [...filteredLeases];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (sortBy === 'propertyTitle') cmp = a.propertyTitle.localeCompare(b.propertyTitle);
      else if (sortBy === 'tenantName') cmp = a.tenantName.localeCompare(b.tenantName);
      else if (sortBy === 'monthlyRent') cmp = a.monthlyRentDzd - b.monthlyRentDzd;
      else if (sortBy === 'securityDeposit') cmp = a.securityDepositDzd - b.securityDepositDzd;
      else if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredLeases, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleTogglePin = useCallback(
    (l: RealEstateLease) => {
      const wasPinned = pinnedIds.has(l.id);
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(l.id)) next.delete(l.id);
        else next.add(l.id);
        return next;
      });
      showToast(wasPinned ? (isAr ? 'تم إلغاء التثبيت' : 'Bail désépinglé') : isAr ? 'تم تثبيت عقد الإيجار' : 'Bail épinglé', 'info');
    },
    [pinnedIds, isAr]
  );

  const handleDelete = useCallback(
    (l: RealEstateLease) => {
      deleteLease(l.id);
      if (selectedLease?.id === l.id) setSelectedLease(null);
    },
    [deleteLease, selectedLease?.id]
  );

  const handleBulkDelete = useCallback(
    (ids: Set<string>) => {
      runUndoBatch(
        {
          vertical: 'real_estate',
          operationType: 'bulk',
          branchId: currentBranch?.id || 'branch_realestate_main',
          summary: isAr
            ? `حذف ${ids.size} عقود إيجار`
            : isEn
            ? `Deleted ${ids.size} leases`
            : `Suppression de ${ids.size} baux locatifs`,
          affectedCount: ids.size,
        },
        () => {
          ids.forEach((id) => deleteLease(id));
        }
      );
      if (selectedLease && ids.has(selectedLease.id)) setSelectedLease(null);
      setSelectedIds(new Set());
    },
    [deleteLease, selectedLease, currentBranch?.id, isAr, isEn]
  );

  const handleEmitReceipt = useCallback((l: RealEstateLease) => {
    setLeaseForQuittance(l);
    setIsQuittanceModalOpen(true);
  }, []);

  const handleRenewLease = useCallback(
    (l: RealEstateLease) => {
      const nextStatus: RealEstateLease['status'] = l.status === 'Active' ? 'Terminated' : 'Active';
      const updated: RealEstateLease = { ...l, status: nextStatus };
      updateLease(updated);
      if (selectedLease?.id === l.id) setSelectedLease(updated);
    },
    [updateLease, selectedLease?.id]
  );

  const handleSelectLease = useCallback((l: RealEstateLease, openerEl?: HTMLElement | null) => {
    setSelectedLease(l);
    setDrawerOpenerEl(openerEl || null);
    setActiveTab('bail');
  }, []);

  const handleExportCsv = useCallback(() => {
    const headers = [
      'ID',
      'Bien Immobilier',
      'Locataire',
      'Téléphone',
      'Agence / Branche',
      'Loyer Mensuel DZD',
      'Dépôt Garantie DZD',
      'Date Début',
      'Date Fin',
      'Périodicité',
      'Statut',
    ];
    const rows = sortedLeases.map((l) => {
      const b = resolveRecordBranch(l, branchesById, currentBranch, language);
      return [
        l.id,
        l.propertyTitle,
        l.tenantName,
        l.tenantPhone,
        b.name,
        l.monthlyRentDzd,
        l.securityDepositDzd,
        l.startDate,
        l.endDate,
        l.paymentFrequency || l.paymentCycle || 'Monthly',
        l.status,
      ];
    });
    downloadCsvSafe(`baux_locatifs_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast(isAr ? 'تم تصدير عقود الكراء CSV' : 'Export CSV des baux généré', 'info');
  }, [sortedLeases, branchesById, currentBranch, language, isAr]);

  const handleSaveNotes = (val: string) => {
    setInspectorNotes(val);
    showToast(isAr ? 'تم حفظ بنود العقد' : 'Clauses particulières enregistrées', 'success');
  };

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (frequencyFilter !== 'All') c++;
    if (branchFilter !== 'All') c++;
    return c;
  }, [frequencyFilter, branchFilter]);

  const hasAnyFilters = statusFilter !== 'All' || frequencyFilter !== 'All' || branchFilter !== 'All' || searchQuery.trim().length > 0;

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('All');
    setFrequencyFilter('All');
    setBranchFilter('All');
  }, []);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (statusFilter !== 'All') {
      chips.push({ key: 'status', label: statusFilter, onRemove: () => setStatusFilter('All') });
    }
    if (frequencyFilter !== 'All') {
      chips.push({ key: 'frequency', label: frequencyFilter, onRemove: () => setFrequencyFilter('All') });
    }
    if (branchFilter !== 'All') {
      const bLabel = branchOptions.find((b) => b.value === branchFilter)?.label || branchFilter;
      chips.push({ key: 'branch', label: bLabel, onRemove: () => setBranchFilter('All') });
    }
    return chips;
  }, [statusFilter, frequencyFilter, branchFilter, branchOptions]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'frequency',
        label: isAr ? 'دورية الدفع' : isEn ? 'Payment Frequency' : 'Périodicité de Règlement',
        value: frequencyFilter,
        onChange: setFrequencyFilter,
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Toutes', count: leases.length },
          { value: 'Monthly', label: isAr ? 'شهري' : 'Mensuel', count: leases.filter((l) => (l.paymentFrequency || l.paymentCycle) === 'Monthly').length },
          { value: 'Quarterly', label: isAr ? 'فصلي' : 'Trimestriel', count: leases.filter((l) => (l.paymentFrequency || l.paymentCycle) === 'Quarterly').length },
          { value: 'Annual', label: isAr ? 'سنوي' : 'Annuel', count: leases.filter((l) => (l.paymentFrequency || l.paymentCycle) === 'Annual' || l.paymentCycle === 'Yearly').length },
        ],
      },
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
    [frequencyFilter, branchFilter, leases, branchOptions, isAr, isEn]
  );

  const columns: ColumnDefinition<RealEstateLease>[] = useMemo(
    () => [
      {
        key: 'propertyTitle',
        header: isAr ? 'العقار المؤجر' : 'Bien Loué',
        width: '2.8*',
        sortable: true,
        renderCell: (l) => (
          <div className="flex items-center gap-2 min-w-0">
            <div data-sq="ctl-sm" data-sq-border="none" className="w-8 h-8 bg-orange-50 dark:bg-orange-950/40 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold t-small shrink-0">
              <Key size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold t-small text-black dark:text-white flex items-center gap-2 truncate">
                <span className="truncate">{l.propertyTitle}</span>
                {pinnedIds.has(l.id) && <Pin size={10} className="fill-[#d4522f] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />}
              </div>
              <div className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                Du {l.startDate} au {l.endDate}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'tenantName',
        header: isAr ? 'المستأجر' : 'Locataire & Contact',
        width: '2.2*',
        sortable: true,
        renderCell: (l) => (
          <div>
            <div className="font-semibold t-small text-black dark:text-white truncate">{l.tenantName}</div>
            <div className="t-cap text-black/55 dark:text-white/55 tabular-nums">{l.tenantPhone}</div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الوكالة' : isEn ? 'Branch' : 'Agence',
        width: '1.6*',
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
        key: 'monthlyRent',
        header: isAr ? 'الإيجار الشهري' : 'Loyer Mensuel',
        width: '1.6*',
        sortable: true,
        renderCell: (l) => <div className="tabular-nums font-semibold t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{formatMoney(l.monthlyRentDzd, language)}</div>,
      },
      {
        key: 'securityDeposit',
        header: isAr ? 'الوديعة الضامنة' : 'Caution Déposée',
        width: '1.6*',
        sortable: true,
        renderCell: (l) => <div className="tabular-nums t-cap text-black/70 dark:text-white/75">{formatMoney(l.securityDepositDzd, language)}</div>,
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : 'Statut',
        width: '1.3*',
        sortable: true,
        renderCell: (l) => (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full t-small font-semibold border ${
              l.status === 'Active'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-neutral-100 text-black/70 border-neutral-200 dark:bg-neutral-800 dark:text-white/75'
            }`}
          >
            {l.status === 'Active' ? (isAr ? 'سارٍ' : 'Actif') : isAr ? 'منتهي' : 'Clôturé'}
          </span>
        ),
      },
    ],
    [pinnedIds, branchesById, currentBranch, language, isAr, isEn]
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

  const activeBranchInfo = activeLease ? resolveRecordBranch(activeLease, branchesById, currentBranch, language) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Key size={22} />}
        title={isAr ? 'العقود' : isEn ? 'Leases' : 'Baux Locatifs'}
        primaryAction={{
          label: isAr ? 'تحرير عقد كراء' : isEn ? 'New Lease' : 'Nouveau Bail',
          onClick: () => setIsLeaseModalOpen(true),
          icon: <Plus size={16} strokeWidth={2.2} />,
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'التزامات الإيجار والضمانات المالية' : 'Engagements Locatifs & Cautions Déposées'}
        language={language}
        primaryCard={{
          label: isAr ? 'عقود الإيجار السارية' : 'Baux Actifs en Cours',
          badgeText: isAr ? 'موثقة قانونياً' : 'Conformes & signés',
          count: leaseCounts.active,
          tone: 'emerald',
          isActive: statusFilter === 'Active',
          onToggle: () => setStatusFilter((prev) => (prev === 'Active' ? 'All' : 'Active')),
        }}
        secondaryCard={{
          label: isAr ? 'تجديد < 30 يوم' : 'Échéances & Cautions',
          badgeText: isAr ? 'ودائع ضامنة' : 'Avec caution séquestre',
          count: leaseCounts.caution,
          tone: 'terracotta',
          isActive: statusFilter === 'Caution',
          onToggle: () => setStatusFilter((prev) => (prev === 'Caution' ? 'All' : 'Caution')),
        }}
        darkCard={{
          label: isAr ? 'الكتلة الإيجارية الشهرية' : 'Quittancement Mensuel',
          badgeCount: totalDeposits,
          badgePrefix: '',
          badgeSuffix: ' DZD',
          formatBadgeValue: (v) => formatMoney(v, language),
          valueCount: totalMonthlyRent,
          valuePrefix: '',
          formatValue: (v) => formatMoney(v, language),
          caption: isAr ? `${leaseCounts.active} إيجار جاري` : `${leaseCounts.active} baux actifs · Cautions séquestrées`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'سجل عقود الإيجار والالتزامات' : 'Registre des Baux & Contrats de Location'}
          liveRegionText={`${sortedLeases.length} ${isAr ? 'عقد' : 'baux'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث بالعقار، المستأجر، الهاتف...' : 'Rechercher bien, locataire, téléphone...'}
          statusOptions={[
            { value: 'All', label: isAr ? 'الكل' : 'Tous', count: leaseCounts.all },
            { value: 'Active', label: isAr ? 'سارية' : 'Actifs', count: leaseCounts.active },
            { value: 'Renew', label: isAr ? 'تجديد' : 'Renouv. <30j', count: leaseCounts.renew },
            { value: 'Terminated', label: isAr ? 'مفسوخة' : 'Résiliés', count: leaseCounts.terminated },
          ]}
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
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
          items={sortedLeases}
          columns={columns}
          keyExtractor={(l) => l.id}
          defaultViewMode="list"
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onBulkDelete={handleBulkDelete}
          isPinned={(l) => pinnedIds.has(l.id)}
          onTogglePin={handleTogglePin}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(field, dir) => {
            setSortBy(field);
            setSortDir(dir);
          }}
          openItemId={activeLease?.id}
          onItemClick={handleSelectLease}
          onViewDetails={handleSelectLease}
          onDelete={handleDelete}
          getRowMeta={(l): Partial<KineticRowData> => {
            const bInfo = resolveRecordBranch(l, branchesById, currentBranch, language);
            const isAct = l.status === 'Active';
            return {
              title: l.propertyTitle,
              subline: `${l.tenantName} · ${l.tenantPhone}`,
              avatarText: (l.tenantName || 'BL').slice(0, 2).toUpperCase(),
              avatarColor: '#d4522f',
              categoryLabel: l.paymentFrequency || l.paymentCycle || 'Monthly',
              branchName: bInfo.name,
              branchCode: bInfo.code,
              isPinned: pinnedIds.has(l.id),
              statusLabel: isAct ? (isAr ? 'سارٍ' : 'Actif') : (isAr ? 'منتهي' : 'Clôturé'),
              statusVariant: isAct ? 'active' : 'neutral',
              metricPrimary: formatMoney(l.monthlyRentDzd, language),
              metricSecondary: `${l.startDate} → ${l.endDate}`,
              detailCol1: { heading: isAr ? 'المستأجر' : 'Locataire', primaryText: l.tenantName },
              detailCol2: { heading: isAr ? 'الوديعة' : 'Caution', primaryText: formatMoney(l.securityDepositDzd, language) },
              detailCol3: { heading: isAr ? 'الانتهاء' : 'Échéance', primaryText: l.endDate },
            };
          }}
          getFanActions={(l): KineticRowFanAction[] => [
            {
              id: 'receipt',
              label: isAr ? 'مخالصة' : 'Quittance',
              icon: <FileText size={14} />,
              onClick: (e) => {
                e.stopPropagation();
                handleEmitReceipt(l);
              },
            },
            {
              id: 'renew',
              label: isAr ? 'تجديد/إنهاء' : 'Statut',
              icon: <ArrowRight size={14} />,
              onClick: (e) => {
                e.stopPropagation();
                handleRenewLease(l);
              },
            },
            {
              id: 'inspect',
              label: isAr ? 'عرض' : 'Détails',
              icon: <Eye size={14} />,
              onClick: (e) => {
                e.stopPropagation();
                handleSelectLease(l, e.currentTarget);
              },
            },
          ]}
          getDetailActions={(l): KineticDetailAction[] => [
            {
              id: 'receipt',
              label: isAr ? 'إصدار مخالصة' : 'Quittance de Loyer',
              icon: <FileText size={14} />,
              onClick: () => handleEmitReceipt(l),
            },
            {
              id: 'renew',
              label: isAr ? 'تجديد/إنهاء' : 'Reconduire/Résilier',
              icon: <ArrowRight size={14} />,
              onClick: () => handleRenewLease(l),
            },
          ]}
          emptyTitle={isAr ? 'لا توجد عقود كراء' : 'Aucun bail trouvé'}
          emptyDescription={
            searchQuery
              ? isAr ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun résultat ne correspond à votre recherche'
              : isAr ? 'قم بتحرير أول عقد إيجار للبدء' : 'Créez votre premier contrat de bail'
          }
          primaryActionLabel={isAr ? 'تحرير عقد كراء' : 'Nouveau Bail'}
          onAddFirstItem={() => setIsLeaseModalOpen(true)}
          onResetFilters={resetAllFilters}
          hasActiveFilters={hasAnyFilters}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedLeases.length}
        entityPluralLabel={isAr ? 'عقد' : isEn ? 'leases' : 'baux'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setFrequencyFilter('All');
          setBranchFilter('All');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeLease)}
        item={activeLease}
        allItems={sortedLeases}
        keyExtractor={(l) => l.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeLease?.propertyTitle || ''}
        subtitle={activeLease ? `${activeLease.tenantName} · ${formatMoney(activeLease.monthlyRentDzd, language)}/mois` : ''}
        avatarText={activeLease?.tenantName?.slice(0, 2).toUpperCase() || 'BL'}
        avatarColor="#d4522f"
        branchName={activeBranchInfo?.name}
        statusLabel={activeLease?.status === 'Active' ? (isAr ? 'سارٍ' : 'Actif') : (isAr ? 'مغلق' : 'Clôturé')}
        statusClassName={
          activeLease?.status === 'Active'
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
            : 'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]'
        }
        tabs={[
          { id: 'bail', label: isAr ? 'العقد' : 'Dossier Bail' },
          { id: 'finance', label: isAr ? 'المالية' : 'Finances' },
          { id: 'quittances', label: isAr ? 'المخالصات' : 'Quittances' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(l) => handleSelectLease(l)}
        onClose={() => setSelectedLease(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(lease, tab) => {
          const leaseReceipts = quittances.filter((q) => q.leaseId === lease.id);
          return (
            <div className="space-y-4">
              <InspectorSection index={0}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'receipt',
                      label: isAr ? 'مخالصة' : 'Quittance',
                      icon: <FileText size={16} />,
                      primary: true,
                      onClick: () => handleEmitReceipt(lease),
                    },
                    {
                      id: 'renew',
                      label: lease.status === 'Active' ? 'Clôturer' : 'Réactiver',
                      icon: <ArrowRight size={16} />,
                      onClick: () => handleRenewLease(lease),
                    },
                    {
                      id: 'pin',
                      label: pinnedIds.has(lease.id) ? (isAr ? 'مثبت' : 'Épinglé') : (isAr ? 'تثبيت' : 'Épingler'),
                      icon: <Pin size={16} />,
                      onClick: () => handleTogglePin(lease),
                    },
                  ]}
                />
              </InspectorSection>

              {tab === 'bail' && (
                <>
                  <InspectorSection index={1} title={isAr ? 'بيانات العقد' : 'Parties & Contrat'}>
                    <InspectorCard>
                      <InspectorKeyValue label={isAr ? 'العقار' : 'Bien loué'} value={lease.propertyTitle} mono={false} />
                      <InspectorKeyValue label={isAr ? 'المستأجر' : 'Locataire'} value={lease.tenantName} mono={false} />
                      <InspectorKeyValue label={isAr ? 'الهاتف' : 'Téléphone'} value={lease.tenantPhone} copyText={lease.tenantPhone} />
                      <InspectorKeyValue label={isAr ? 'بداية العقد' : "Date d'effet"} value={lease.startDate} />
                      <InspectorKeyValue label={isAr ? 'انتهاء العقد' : 'Échéance fin'} value={lease.endDate} />
                      <InspectorKeyValue label={isAr ? 'الدورية' : 'Périodicité'} value={lease.paymentFrequency || lease.paymentCycle} tone="accent" mono={false} isLast />
                    </InspectorCard>
                  </InspectorSection>
                  <InspectorSection index={2} title={isAr ? 'بنود خاصة' : 'Clauses particulières'}>
                    <InspectorNotesField
                      value={inspectorNotes}
                      onSave={handleSaveNotes}
                      placeholder={isAr ? 'ملاحظات وشروط العقد...' : "Clauses particulières, état des lieux d'entrée..."}
                    />
                  </InspectorSection>
                </>
              )}

              {tab === 'finance' && (
                <>
                  <InspectorSection index={1} title={isAr ? 'الإيجار الشهري' : 'Loyer Mensuel'}>
                    <InspectorBigStat
                      value={formatMoney(lease.monthlyRentDzd, language)}
                      tone="accent"
                      caption={`${lease.paymentFrequency || lease.paymentCycle} · ${lease.status === 'Active' ? 'Actif' : 'Clôturé'}`}
                    />
                  </InspectorSection>
                  <InspectorSection index={2} title={isAr ? 'الضمان والأتعاب' : 'Caution & Honoraires'}>
                    <InspectorCard>
                      <InspectorKeyValue label={isAr ? 'الوديعة الضامنة' : 'Caution déposée'} value={formatMoney(lease.securityDepositDzd, language)} />
                      <InspectorKeyValue
                        label={isAr ? 'أتعاب الوكالة' : 'Honoraires agence'}
                        value={formatMoney(lease.agencyCommissionDzd || 0, language)}
                        tone="ok"
                        isLast
                      />
                    </InspectorCard>
                  </InspectorSection>
                </>
              )}

              {tab === 'quittances' && (
                <>
                  <InspectorSection index={1} title={isAr ? 'سجل المخالصات' : 'Quittances émises'}>
                    {leaseReceipts.length === 0 ? (
                      <KineticEmptyStateMotion motionKey={`re-quit-${lease.id}`}>
                        <EmptyState
                          variant="compact"
                          icon={<FileText />}
                          title={isAr ? 'لا توجد مخالصات' : 'Aucune quittance émise'}
                          description="Émettez la première quittance ci-dessous"
                        />
                      </KineticEmptyStateMotion>
                    ) : (
                      <InspectorCard>
                        {leaseReceipts.map((q, idx) => (
                          <InspectorListItem
                            key={q.id}
                            title={`${q.quittanceNumber} · Mois ${q.periodMonth}/${q.periodYear}`}
                            subtitle={`${q.paymentDate} · Timbre ${formatMoney(q.timbreFiscalDzd, language)}`}
                            metaRight={formatMoney(q.totalCollectedDzd, language)}
                            badge={{ label: q.paymentMethod, tone: 'ok' }}
                            isLast={idx === leaseReceipts.length - 1}
                          />
                        ))}
                      </InspectorCard>
                    )}
                  </InspectorSection>
                  <InspectorSection index={2}>
                    <InspectorWideButton
                      label={isAr ? 'تحصيل وإصدار مخالصة' : 'Encaisser Loyer & Émettre Quittance'}
                      icon={<FileText size={15} />}
                      tone="accent"
                      onClick={() => handleEmitReceipt(lease)}
                    />
                  </InspectorSection>
                </>
              )}
            </div>
          );
        }}
      />

      <RealEstateLeaseModal
        isOpen={isLeaseModalOpen}
        onClose={() => setIsLeaseModalOpen(false)}
        properties={properties}
        onSave={(newLease) => {
          addLease(newLease);
          setSelectedLease(newLease);
          setIsLeaseModalOpen(false);
        }}
      />

      {isQuittanceModalOpen && (
        <QuittanceModal
          isOpen={isQuittanceModalOpen}
          onClose={() => {
            setIsQuittanceModalOpen(false);
            setLeaseForQuittance(null);
          }}
          leases={leases}
          selectedLease={leaseForQuittance || selectedLease}
          onSave={(newQ) => {
            addQuittance(newQ);
            setIsQuittanceModalOpen(false);
            setLeaseForQuittance(null);
          }}
        />
      )}
    </div>
  );
};
