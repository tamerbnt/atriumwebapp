import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Key,
  Plus,
  Pin,
  Save,
  Check,
  FileText,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { RealEstateLease } from '../../../types';
import { useRealEstateData } from './realEstateData';
import { AtriumButton } from '../../ui/AtriumButton';
import { RealEstateLeaseModal } from './RealEstateLeaseModal';
import { QuittanceModal } from './QuittanceModal';
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
  const [noteSaved, setNoteSaved] = useState(false);

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
      showToast(isAr ? 'تم حذف عقد الإيجار' : 'Bail de location supprimé', 'success');
    },
    [deleteLease, selectedLease?.id, isAr]
  );

  const handleBulkDelete = useCallback(
    (ids: Set<string>) => {
      ids.forEach((id) => deleteLease(id));
      if (selectedLease && ids.has(selectedLease.id)) setSelectedLease(null);
      setSelectedIds(new Set());
      showToast(isAr ? 'تم حذف العقود المحددة' : 'Baux sélectionnés supprimés', 'success');
    },
    [deleteLease, selectedLease, isAr]
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
      showToast(
        nextStatus === 'Active'
          ? isAr ? 'تم تجديد عقد الكراء' : 'Bail renouvelé avec succès'
          : isAr ? 'تم إنهاء عقد الكراء' : 'Bail clôturé / résilié',
        'info'
      );
    },
    [updateLease, selectedLease?.id, isAr]
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

  const handleSaveNotes = () => {
    if (!activeLease) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
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
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-bold text-xs shrink-0">
              <Key size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs text-black dark:text-white flex items-center gap-1.5 truncate">
                <span className="truncate">{l.propertyTitle}</span>
                {pinnedIds.has(l.id) && <Pin size={10} className="fill-[#d4522f] text-[#d4522f] shrink-0" />}
              </div>
              <div className="text-[10px] text-black/55 dark:text-white/55 font-mono">
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
            <div className="font-semibold text-xs text-black dark:text-white truncate">{l.tenantName}</div>
            <div className="text-[10px] text-black/55 dark:text-white/55 font-mono">{l.tenantPhone}</div>
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
            <div className="text-xs font-medium text-black/75 dark:text-white/75 truncate flex items-center gap-1.5">
              <MapPin size={12} className="text-[#d4522f] shrink-0" />
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
        renderCell: (l) => <div className="font-mono font-bold text-xs text-[#d4522f]">{formatMoney(l.monthlyRentDzd, language)}</div>,
      },
      {
        key: 'securityDeposit',
        header: isAr ? 'الوديعة الضامنة' : 'Caution Déposée',
        width: '1.6*',
        sortable: true,
        renderCell: (l) => <div className="font-mono text-xs text-black/70 dark:text-white/75">{formatMoney(l.securityDepositDzd, language)}</div>,
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : 'Statut',
        width: '1.3*',
        sortable: true,
        renderCell: (l) => (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
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
        subtitle={
          isAr
            ? `${leases.length} عقد كراء · ${leaseCounts.active} سارٍ`
            : `${leases.length} contrats enregistrés · ${leaseCounts.active} baux actifs`
        }
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
          data={sortedLeases}
          columns={columns}
          keyExtractor={(l) => l.id}
          defaultViewMode={viewMode}
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
          customActions={(l) => [
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
          renderCard={(l) => (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs bg-[#d4522f]/10 text-[#d4522f] px-2.5 py-1 rounded-lg border border-[#d4522f]/20">
                  {formatMoney(l.monthlyRentDzd, language)} /mois
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    l.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-neutral-100 text-black/70 dark:bg-neutral-800 dark:text-white/75'
                  }`}
                >
                  {l.status === 'Active' ? 'Actif' : 'Clôturé'}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-black dark:text-white line-clamp-1">{l.propertyTitle}</h3>
                <div className="text-xs text-black/55 dark:text-white/55 font-medium mt-0.5">
                  Locataire: {l.tenantName} ({l.tenantPhone})
                </div>
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-black/55 dark:text-white/55">
                <span>
                  {l.startDate} → {l.endDate}
                </span>
                <span className="font-mono text-black/70 dark:text-white/75">
                  Caution: {formatMoney(l.securityDepositDzd, language)}
                </span>
              </div>
            </div>
          )}
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
        branchName={activeBranchInfo?.name}
        statusLabel={activeLease?.status === 'Active' ? (isAr ? 'سارٍ' : 'Actif') : (isAr ? 'مغلق' : 'Clôturé')}
        statusClassName={
          activeLease?.status === 'Active'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-neutral-100 text-black/70 border border-neutral-200 dark:bg-neutral-800 dark:text-white/75'
        }
        tabs={[
          { id: 'bail', label: isAr ? 'العقد' : 'Dossier Bail' },
          { id: 'finance', label: isAr ? 'المالية' : 'Finances' },
          { id: 'quittances', label: isAr ? 'المخالصات' : 'Quittances' },
          { id: 'notes', label: isAr ? 'البنود' : 'Clauses' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(l) => handleSelectLease(l)}
        onClose={() => setSelectedLease(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(lease, tab) => (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <AtriumButton
                type="button"
                variant="primary"
                size="sm"
                icon={<FileText size={13} />}
                onClick={() => handleEmitReceipt(lease)}
              >
                {isAr ? 'مخالصة' : 'Émettre Quittance'}
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="outline"
                size="sm"
                icon={<ArrowRight size={13} />}
                onClick={() => handleRenewLease(lease)}
              >
                {lease.status === 'Active' ? 'Clôturer' : 'Réactiver'}
              </AtriumButton>
            </div>

            {tab === 'bail' && (
              <div className="space-y-3.5 text-xs">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Bien loué:</span>
                    <span className="font-semibold text-black dark:text-white truncate max-w-[230px]">{lease.propertyTitle}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Locataire:</span>
                    <span className="font-semibold text-black dark:text-white">{lease.tenantName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Téléphone:</span>
                    <span className="font-mono text-black dark:text-white">{lease.tenantPhone}</span>
                  </div>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Date d&apos;effet:</span>
                    <span className="font-mono text-black dark:text-white">{lease.startDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Échéance de fin:</span>
                    <span className="font-mono text-black dark:text-white">{lease.endDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Périodicité:</span>
                    <span className="font-semibold text-[#d4522f]">{lease.paymentFrequency || lease.paymentCycle}</span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'finance' && (
              <div className="space-y-3.5 text-xs">
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Loyer mensuel:</span>
                    <span className="font-mono font-bold text-black dark:text-white">{formatMoney(lease.monthlyRentDzd, language)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Caution de garantie:</span>
                    <span className="font-mono text-black dark:text-white font-semibold">{formatMoney(lease.securityDepositDzd, language)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-black/55 dark:text-white/55">Honoraires d&apos;agence:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {formatMoney(lease.agencyCommissionDzd || 0, language)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'quittances' && (
              <div className="space-y-3 text-xs">
                {quittances
                  .filter((q) => q.leaseId === lease.id)
                  .map((q) => (
                    <div
                      key={q.id}
                      className="p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-semibold text-[11px]">
                        <span className="font-mono text-[#d4522f] font-bold">{q.quittanceNumber}</span>
                        <span className="text-emerald-600 font-mono text-[10px]">Paiement {q.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between items-center text-black/70 dark:text-white/75">
                        <span>
                          Période: Mois {q.periodMonth}/{q.periodYear}
                        </span>
                        <span className="font-mono font-bold text-black dark:text-white">{formatMoney(q.totalCollectedDzd, language)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-black/55 dark:text-white/55">
                        <span>Timbre fiscal: {formatMoney(q.timbreFiscalDzd, language)}</span>
                        <span>Date: {q.paymentDate}</span>
                      </div>
                    </div>
                  ))}
                {quittances.filter((q) => q.leaseId === lease.id).length === 0 && (
                  <div className="text-center py-4 text-black/55 dark:text-white/55 text-xs">
                    Aucune quittance émise pour ce bail.
                  </div>
                )}
                <AtriumButton
                  type="button"
                  variant="primary"
                  size="sm"
                  className="w-full justify-center"
                  icon={<FileText size={13} />}
                  onClick={() => handleEmitReceipt(lease)}
                >
                  Encaisser Loyer & Émettre Quittance
                </AtriumButton>
              </div>
            )}

            {tab === 'notes' && (
              <div className="space-y-3 text-xs">
                <p className="text-black/55 dark:text-white/55 text-[11px]">
                  Clauses particulières, état des lieux d&apos;entrée et interdictions (sous-location, animaux) :
                </p>
                <textarea
                  rows={6}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  placeholder="Noter les conditions spécifiques d'entretien chaudière, taxe d'habitation..."
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white text-xs focus:ring-1 focus:ring-[#d4522f] outline-hidden resize-none"
                />
                <AtriumButton
                  type="button"
                  variant="primary"
                  size="sm"
                  className="w-full justify-center"
                  icon={noteSaved ? <Check size={14} /> : <Save size={14} />}
                  onClick={handleSaveNotes}
                >
                  {noteSaved ? (isAr ? 'تم الحفظ' : 'Clauses enregistrées') : isAr ? 'حفظ' : 'Enregistrer'}
                </AtriumButton>
              </div>
            )}
          </div>
        )}
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
            showToast(
              isAr ? 'تم إدراج مخالصة الإيجار بنجاح' : 'Quittance de loyer avec timbre fiscal enregistrée',
              'success'
            );
            setIsQuittanceModalOpen(false);
            setLeaseForQuittance(null);
          }}
        />
      )}
    </div>
  );
};
