import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  FileText,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Printer,
  Calendar,
  MapPin,
  Eye,
} from 'lucide-react';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { MandateModal } from './MandateModal';
import { useRealEstateData } from './realEstateData';
import { RealEstateMandate } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { useAtriumStore, showToast } from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
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
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const RealEstateMandatesView: React.FC<any> = () => {
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

  const { mandates, properties, addMandate, updateMandate, deleteMandate } = useRealEstateData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [listingFilter, setListingFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['mnd_01']));
  const [sortBy, setSortBy] = useState<string>('mandateNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isMandateModalOpen, setIsMandateModalOpen] = useState(false);
  const [selectedMandate, setSelectedMandate] = useState<RealEstateMandate | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('mandat');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeMandate = useMemo(() => {
    if (!selectedMandate) return null;
    return mandates.find((m) => m.id === selectedMandate.id) || selectedMandate;
  }, [selectedMandate, mandates]);

  const activeCount = useMemo(() => mandates.filter((m) => m.status === 'Active').length, [mandates]);
  const expiringCount = useMemo(() => mandates.filter((m) => m.status === 'Expiring').length, [mandates]);
  const exclusiveCount = useMemo(() => mandates.filter((m) => m.isExclusive).length, [mandates]);
  const totalVolumeDzd = useMemo(() => mandates.reduce((sum, m) => sum + m.askingPriceDzd, 0), [mandates]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    mandates.forEach((m) => {
      const b = resolveRecordBranch(m, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [mandates, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: mandates.length },
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
        count: branchCounts.get(currentBranch.id) || mandates.length,
      });
    }
    return opts;
  }, [branches, currentBranch, branchCounts, mandates.length, isAr, isEn]);

  const filteredMandates = useMemo(() => {
    return mandates.filter((m) => {
      if (statusFilter === 'active' && m.status !== 'Active') return false;
      if (statusFilter === 'expiring' && m.status !== 'Expiring') return false;
      if (statusFilter === 'exclusive' && !m.isExclusive) return false;
      if (listingFilter !== 'All' && m.listingType !== listingFilter) return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(m, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const b = resolveRecordBranch(m, branchesById, currentBranch, language);
        const matches =
          m.mandateNumber.toLowerCase().includes(q) ||
          m.propertyTitle.toLowerCase().includes(q) ||
          m.ownerFullName.toLowerCase().includes(q) ||
          m.propertyAddress.toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [mandates, searchQuery, statusFilter, listingFilter, branchFilter, branchesById, currentBranch, language]);

  const sortedMandates = useMemo(() => {
    const list = [...filteredMandates];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (sortBy === 'mandateNumber') cmp = a.mandateNumber.localeCompare(b.mandateNumber);
      else if (sortBy === 'price') cmp = a.askingPriceDzd - b.askingPriceDzd;
      else if (sortBy === 'commission') cmp = a.commissionEstimatedTtcDzd - b.commissionEstimatedTtcDzd;
      else if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredMandates, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleOpenInspector = useCallback((mandate: RealEstateMandate, openerEl?: HTMLElement | null) => {
    setSelectedMandate(mandate);
    setDrawerOpenerEl(openerEl || null);
    setInspectorTab('mandat');
  }, []);

  const handleProrogation = useCallback(
    (mandate: RealEstateMandate) => {
      const start = new Date(mandate.endDate);
      start.setMonth(start.getMonth() + 3);
      const newEnd = start.toISOString().split('T')[0];
      const updated: RealEstateMandate = {
        ...mandate,
        status: 'Active',
        endDate: newEnd,
        renewalCount: mandate.renewalCount + 1,
        notes: `${mandate.notes || ''} [Prorogation de 3 mois validée le ${new Date().toLocaleDateString()}]`,
        updatedAt: new Date().toISOString(),
      };
      updateMandate(updated);
      if (selectedMandate?.id === mandate.id) setSelectedMandate(updated);
    },
    [updateMandate, selectedMandate?.id]
  );

  const handleDelete = useCallback(
    (m: RealEstateMandate) => {
      deleteMandate(m.id);
      if (selectedMandate?.id === m.id) setSelectedMandate(null);
    },
    [deleteMandate, selectedMandate?.id]
  );

  const handleBulkDelete = useCallback(
    (ids: Set<string>) => {
      runUndoBatch(
        {
          vertical: 'real_estate',
          operationType: 'bulk',
          branchId: currentBranch?.id || 'branch_realestate_main',
          summary: isAr
            ? `حذف ${ids.size} وكالات`
            : isEn
            ? `Deleted ${ids.size} mandates`
            : `Suppression de ${ids.size} mandats`,
          affectedCount: ids.size,
        },
        () => {
          ids.forEach((id) => deleteMandate(id));
        }
      );
      if (selectedMandate && ids.has(selectedMandate.id)) setSelectedMandate(null);
      setSelectedIds(new Set());
    },
    [deleteMandate, selectedMandate, currentBranch?.id, isAr, isEn]
  );

  const handleTogglePin = useCallback((m: RealEstateMandate) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(m.id)) next.delete(m.id);
      else next.add(m.id);
      return next;
    });
  }, []);

  const handleExportCsv = useCallback(() => {
    const headers = [
      'N° Mandat',
      'Type',
      'Opération',
      'Exclusif',
      'Bien Immobilier',
      'Mandant',
      'Téléphone',
      'Agence / Branche',
      'Prix Demandé (DZD)',
      'Honoraires TTC (DZD)',
      'Fin Validité',
      'Statut',
    ];
    const rows = sortedMandates.map((m) => {
      const b = resolveRecordBranch(m, branchesById, currentBranch, language);
      return [
        m.mandateNumber,
        m.mandateType,
        m.listingType,
        m.isExclusive ? 'Oui' : 'Non',
        m.propertyTitle,
        m.ownerFullName,
        m.ownerPhone,
        b.name,
        m.askingPriceDzd,
        m.commissionEstimatedTtcDzd,
        m.endDate,
        m.status,
      ];
    });
    downloadCsvSafe(`mandats_decret_09_18_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast(isAr ? 'تم تصدير سجل الوكالات' : 'Export CSV du registre des mandats terminé', 'info');
  }, [sortedMandates, branchesById, currentBranch, language, isAr]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (listingFilter !== 'All') c++;
    if (branchFilter !== 'All') c++;
    return c;
  }, [listingFilter, branchFilter]);

  const hasAnyFilters = statusFilter !== 'all' || listingFilter !== 'All' || branchFilter !== 'All' || searchQuery.trim().length > 0;

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setListingFilter('All');
    setBranchFilter('All');
  }, []);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (statusFilter !== 'all') {
      chips.push({ key: 'status', label: statusFilter, onRemove: () => setStatusFilter('all') });
    }
    if (listingFilter !== 'All') {
      chips.push({
        key: 'listing',
        label: listingFilter === 'Sale' ? 'Vente' : 'Location',
        onRemove: () => setListingFilter('All'),
      });
    }
    if (branchFilter !== 'All') {
      const bLabel = branchOptions.find((b) => b.value === branchFilter)?.label || branchFilter;
      chips.push({ key: 'branch', label: bLabel, onRemove: () => setBranchFilter('All') });
    }
    return chips;
  }, [statusFilter, listingFilter, branchFilter, branchOptions]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'listing',
        label: isAr ? 'نوع المعاملة' : isEn ? 'Operation' : 'Type de Transaction',
        value: listingFilter,
        onChange: setListingFilter,
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous', count: mandates.length },
          { value: 'Sale', label: isAr ? 'بيع' : 'Vente', count: mandates.filter((m) => m.listingType === 'Sale').length },
          { value: 'Rental', label: isAr ? 'إيجار' : 'Location', count: mandates.filter((m) => m.listingType === 'Rental').length },
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
    [listingFilter, branchFilter, mandates, branchOptions, isAr, isEn]
  );

  const columns: ColumnDefinition<RealEstateMandate>[] = useMemo(
    () => [
      {
        key: 'mandateNumber',
        header: isAr ? 'رقم الوكالة والعقار' : 'N° Mandat & Bien',
        width: '2.8*',
        sortable: true,
        renderCell: (m) => (
          <div className="min-w-0">
            <div className="tabular-nums font-semibold t-small text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center gap-2">
              <span>{m.mandateNumber}</span>
              {m.isExclusive && (
                <span className="t-small font-semibold px-2 py-1 rounded-[var(--r-check,6px)] bg-[#d4522f]/15 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                  Exclusif
                </span>
              )}
            </div>
            <div className="t-small font-semibold text-black dark:text-white truncate mt-0.5">{m.propertyTitle}</div>
            <div className="t-cap text-black/55 dark:text-white/75 truncate">{m.propertyAddress}</div>
          </div>
        ),
      },
      {
        key: 'owner',
        header: isAr ? 'الموكل (المالك)' : 'Mandant (Propriétaire)',
        width: '2.0*',
        renderCell: (m) => (
          <div className="t-cap">
            <div className="font-semibold text-black dark:text-white truncate">{m.ownerFullName}</div>
            <div className="text-black/55 dark:text-white/75 tabular-nums">{m.ownerPhone}</div>
            <div className="t-cap text-black/55 dark:text-white/55 tabular-nums">CNI: {m.ownerNationalId}</div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الوكالة' : isEn ? 'Branch' : 'Agence',
        width: '1.6*',
        sortable: true,
        renderCell: (m) => {
          const b = resolveRecordBranch(m, branchesById, currentBranch, language);
          return (
            <div className="t-small font-medium text-black/75 dark:text-white/75 truncate flex items-center gap-2">
              <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
              <span className="truncate">{b.name}</span>
            </div>
          );
        },
      },
      {
        key: 'price',
        header: isAr ? 'السعر المطلوب' : 'Prix Demandé',
        width: '1.7*',
        sortable: true,
        renderCell: (m) => (
          <div className="t-cap">
            <div className="tabular-nums font-semibold text-black dark:text-white">{formatMoney(m.askingPriceDzd, language)}</div>
            <div className="t-cap text-black/55 dark:text-white/75 mt-0.5">
              {m.mandateType.replace(/_/g, ' ')} · {m.listingType === 'Sale' ? 'Vente' : 'Location'}
            </div>
          </div>
        ),
      },
      {
        key: 'commission',
        header: isAr ? 'أتعاب الوكالة' : 'Honoraires TTC',
        width: '1.6*',
        sortable: true,
        renderCell: (m) => (
          <div className="t-cap">
            <div className="tabular-nums font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">{formatMoney(m.commissionEstimatedTtcDzd, language)}</div>
            <div className="t-cap text-black/55 dark:text-white/75">
              {m.commissionCalculationMode === 'DecreeTranches' ? 'Décret 09-18' : `${m.commissionRatePercent}% Négocié`}
            </div>
          </div>
        ),
      },
      {
        key: 'validity',
        header: isAr ? 'المدة والصلاحية' : 'Validité',
        width: '1.6*',
        renderCell: (m) => (
          <div className="t-cap">
            <div className="text-black dark:text-white flex items-center gap-1 tabular-nums">
              <Calendar className="w-3.5 h-3.5 text-black/55 dark:text-white/55" />
              <span>{m.endDate}</span>
            </div>
            {m.status === 'Expiring' ? (
              <span className="t-small font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-3 h-3" />
                <span>Expire &lt;15j</span>
              </span>
            ) : (
              <span className="t-cap text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle className="w-3 h-3" />
                <span>Valide</span>
              </span>
            )}
          </div>
        ),
      },
    ],
    [branchesById, currentBranch, language, isAr, isEn]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: mandates.length > 0,
  });

  if (showSkeleton && (mandates.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2*', minWidth: '140px' },
          { width: '2.5*', minWidth: '180px' },
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

  const activeBranchInfo = activeMandate ? resolveRecordBranch(activeMandate, branchesById, currentBranch, language) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<FileText size={22} />}
        title={isAr ? 'الوكالات' : isEn ? 'Mandates' : 'Mandats Décret 09-18'}
        primaryAction={{
          label: isAr ? 'تحرير وكالة جديدة' : isEn ? 'New Mandate' : 'Nouveau Mandat',
          onClick: () => setIsMandateModalOpen(true),
          icon: <Plus size={16} strokeWidth={2.2} />,
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'حالة الوكالات القانونية وحجم المحفظة' : 'Portefeuille des Mandats & Conformité Décret 09-18'}
        language={language}
        primaryCard={{
          label: isAr ? 'وكالات سارية' : 'Mandats Actifs',
          badgeText: isAr ? 'قيد الاستغلال' : "En cours d'exploitation",
          count: activeCount,
          tone: 'emerald',
          isActive: statusFilter === 'active',
          onToggle: () => setStatusFilter((prev) => (prev === 'active' ? 'all' : 'active')),
        }}
        secondaryCard={{
          label: isAr ? 'تنتهي خلال 15 يوماً' : 'Expirant sous 15j',
          badgeText: isAr ? 'يتطلب ملحق تمديد' : 'Avenant requis',
          count: expiringCount,
          tone: 'terracotta',
          isActive: statusFilter === 'expiring',
          onToggle: () => setStatusFilter((prev) => (prev === 'expiring' ? 'all' : 'expiring')),
        }}
        darkCard={{
          label: isAr ? 'قيمة المحفظة تحت الوكالة' : 'Valeur Portefeuille Sous Mandat',
          badgeCount: exclusiveCount,
          badgePrefix: '',
          badgeSuffix: isAr ? ' حصري' : ' exclusifs',
          valueCount: totalVolumeDzd,
          valuePrefix: '',
          formatValue: (v) => formatMoney(v, language),
          caption: isAr ? `${mandates.length} وكالة مسجلة بالسجل` : `${mandates.length} mandats au registre légal`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'سجل الوكالات القانوني' : 'Registre des Mandats'}
          liveRegionText={`${sortedMandates.length} ${isAr ? 'وكالة' : 'mandats'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث برقم الوكالة MND أو الموكل...' : 'Rechercher N° MND, bien, mandant...'}
          statusOptions={[
            { value: 'all', label: isAr ? 'الكل' : 'Tous', count: mandates.length },
            { value: 'active', label: isAr ? 'سارية' : 'Actifs', count: activeCount },
            { value: 'expiring', label: isAr ? 'تنتهي' : 'Expirant', count: expiringCount },
            { value: 'exclusive', label: isAr ? 'حصرية' : 'Exclusifs', count: exclusiveCount },
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
          items={sortedMandates}
          keyExtractor={(m) => m.id}
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
          onBulkDelete={handleBulkDelete}
          isPinned={(m) => pinnedIds.has(m.id)}
          onTogglePin={handleTogglePin}
          openItemId={activeMandate?.id}
          onItemClick={handleOpenInspector}
          onViewDetails={handleOpenInspector}
          onDelete={handleDelete}
          getRowMeta={(m): Partial<KineticRowData> => {
            const bInfo = resolveRecordBranch(m, branchesById, currentBranch, language);
            const isExpiring = m.status === 'Expiring';
            return {
              title: `${m.mandateNumber} · ${m.propertyTitle}`,
              subline: `${m.ownerFullName} · ${m.ownerPhone}`,
              avatarText: m.isExclusive ? 'EX' : 'MN',
              avatarColor: '#d4522f',
              vipBadge: m.isExclusive ? 'Exclusif' : undefined,
              categoryLabel: m.listingType === 'Sale' ? 'Vente' : 'Location',
              branchName: bInfo.name,
              branchCode: bInfo.code,
              isPinned: pinnedIds.has(m.id),
              statusLabel: isExpiring ? 'Expire <15j' : 'Actif',
              statusVariant: isExpiring ? 'warning' : 'active',
              metricPrimary: formatMoney(m.askingPriceDzd, language),
              metricSecondary: `Hon: ${formatMoney(m.commissionEstimatedTtcDzd, language)}`,
              detailCol1: { heading: isAr ? 'الموكل' : 'Mandant', primaryText: m.ownerFullName },
              detailCol2: { heading: isAr ? 'الصلاحية' : 'Échéance', primaryText: m.endDate },
              detailCol3: { heading: 'Décret 09-18', primaryText: formatMoney(m.commissionEstimatedTtcDzd, language) },
            };
          }}
          getFanActions={(item): KineticRowFanAction[] => [
            {
              id: 'proroger',
              label: isAr ? 'تمديد 3 أشهر' : 'Proroger',
              icon: <Clock size={14} />,
              onClick: (e) => {
                e.stopPropagation();
                handleProrogation(item);
              },
            },
            {
              id: 'print',
              label: isAr ? 'طباعة' : 'Imprimer',
              icon: <Printer size={14} />,
              onClick: (e) => {
                e.stopPropagation();
                showToast(
                  isAr ? `جاري طباعة عقد الوكالة ${item.mandateNumber}...` : `Impression du mandat ${item.mandateNumber}...`,
                  'info'
                );
                if (typeof window !== 'undefined') window.print();
              },
            },
            {
              id: 'inspect',
              label: isAr ? 'عرض' : 'Détails',
              icon: <Eye size={14} />,
              onClick: (e) => {
                e.stopPropagation();
                handleOpenInspector(item, e.currentTarget);
              },
            },
          ]}
          getDetailActions={(item): KineticDetailAction[] => [
            {
              id: 'proroger',
              label: isAr ? 'تمديد 3 أشهر' : 'Proroger 3 mois',
              icon: <Clock size={14} />,
              onClick: () => handleProrogation(item),
            },
            {
              id: 'print',
              label: isAr ? 'طباعة العقد' : 'Imprimer Mandat',
              icon: <Printer size={14} />,
              onClick: () => {
                showToast(
                  isAr ? `جاري طباعة عقد الوكالة ${item.mandateNumber}...` : `Impression du mandat ${item.mandateNumber}...`,
                  'info'
                );
                if (typeof window !== 'undefined') window.print();
              },
            },
          ]}
          emptyTitle={isAr ? 'لا توجد وكالات مطابقة' : 'Aucun mandat enregistré'}
          emptyDescription={isAr ? 'أضف وكالة جديدة أو أعد ضبط المرشحات' : 'Créez un nouveau mandat ou réinitialisez les filtres'}
          primaryActionLabel={isAr ? 'تحرير وكالة جديدة' : 'Nouveau Mandat'}
          onAddFirstItem={() => setIsMandateModalOpen(true)}
          onResetFilters={resetAllFilters}
          hasActiveFilters={hasAnyFilters}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedMandates.length}
        entityPluralLabel={isAr ? 'وكالة' : isEn ? 'mandates' : 'mandats'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setListingFilter('All');
          setBranchFilter('All');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeMandate)}
        item={activeMandate}
        allItems={sortedMandates}
        keyExtractor={(m) => m.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeMandate?.mandateNumber || ''}
        subtitle={activeMandate?.propertyTitle}
        avatarText={activeMandate?.isExclusive ? 'EX' : 'MN'}
        avatarColor="#d4522f"
        branchName={activeBranchInfo?.name}
        statusLabel={activeMandate?.status === 'Active' ? 'Actif & Conforme' : activeMandate?.status}
        statusClassName={
          activeMandate?.status === 'Expiring'
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
            : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
        }
        tabs={[
          { id: 'mandat', label: isAr ? 'الوكالة' : 'Contrat & Bien' },
          { id: 'mandant', label: isAr ? 'الموكل' : 'Mandant' },
          { id: 'honoraires', label: isAr ? 'الأتعاب' : 'Honoraires 09-18' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(m) => handleOpenInspector(m)}
        onClose={() => setSelectedMandate(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(m, tab) => (
          <div className="space-y-4">
            <InspectorSection index={0}>
              <InspectorQuickActions
                actions={[
                  {
                    id: 'proroger',
                    label: isAr ? 'تمديد 3 أشهر' : 'Proroger 3M',
                    icon: <Clock size={16} />,
                    primary: true,
                    onClick: () => handleProrogation(m),
                  },
                  {
                    id: 'print',
                    label: isAr ? 'طباعة العقد' : 'Imprimer',
                    icon: <Printer size={16} />,
                    onClick: () => {
                      if (typeof window !== 'undefined') window.print();
                    },
                  },
                ]}
              />
            </InspectorSection>

            {tab === 'mandat' && (
              <>
                <InspectorSection index={1} title={isAr ? 'القيمة المطلوبة' : 'Prix Demandé'}>
                  <InspectorBigStat
                    value={formatMoney(m.askingPriceDzd, language)}
                    tone="accent"
                    caption={`${m.isExclusive ? 'Exclusivité Totale' : 'Mandat Simple'} · Seuil min ${formatMoney(m.minimumAcceptablePriceDzd, language)}`}
                  />
                </InspectorSection>
                <InspectorSection index={2} title={isAr ? 'شروط الوكالة والعقار' : 'Validité & Bien Sous Contrat'}>
                  <InspectorCard>
                    <InspectorKeyValue label={isAr ? 'العقار' : 'Bien'} value={m.propertyTitle} mono={false} />
                    <InspectorKeyValue label={isAr ? 'العنوان' : 'Adresse'} value={m.propertyAddress} mono={false} />
                    <InspectorKeyValue label={isAr ? 'الصلاحية' : 'Validité'} value={`${m.startDate} → ${m.endDate}`} />
                    <InspectorKeyValue label={isAr ? 'التجديدات' : 'Avenants'} value={`${m.renewalCount} avenant(s)`} isLast />
                  </InspectorCard>
                </InspectorSection>
              </>
            )}

            {tab === 'mandant' && (
              <InspectorSection index={1} title={isAr ? 'هوية الموكل' : 'Identité du Mandant'}>
                <InspectorCard>
                  <InspectorKeyValue label={isAr ? 'المالك' : 'Nom complet'} value={m.ownerFullName} mono={false} />
                  <InspectorKeyValue label={isAr ? 'الهاتف' : 'Téléphone'} value={m.ownerPhone} copyText={m.ownerPhone} />
                  <InspectorKeyValue label="CNI / Passeport" value={m.ownerNationalId} copyText={m.ownerNationalId} isLast={!m.ownerIdIssueDate && !m.notes} />
                  {m.ownerIdIssueDate && (
                    <InspectorKeyValue label={isAr ? 'تاريخ الإصدار' : 'Délivré le'} value={`${m.ownerIdIssueDate} (${m.ownerIdIssueDaira || ''})`} mono={false} isLast={!m.notes} />
                  )}
                  {m.notes && <InspectorKeyValue label={isAr ? 'ملاحظات' : 'Notes'} value={m.notes} mono={false} isLast />}
                </InspectorCard>
              </InspectorSection>
            )}

            {tab === 'honoraires' && (
              <>
                <InspectorSection index={1} title={isAr ? 'إجمالي الأتعاب' : 'Honoraires TTC (Décret 09-18)'}>
                  <InspectorBigStat
                    value={formatMoney(m.commissionEstimatedTtcDzd, language)}
                    tone="ok"
                    caption={m.commissionCalculationMode === 'DecreeTranches' ? 'Barème Décret 09-18' : `${m.commissionRatePercent}% Négocié`}
                  />
                </InspectorSection>
                <InspectorSection index={2} title={isAr ? 'التفصيل الضريبي' : 'Détail Fiscal'}>
                  <InspectorCard>
                    <InspectorKeyValue label="Base HT" value={formatMoney(m.commissionEstimatedHtDzd, language)} />
                    <InspectorKeyValue label="TVA Légale (19%)" value={formatMoney(Math.round(m.commissionEstimatedHtDzd * 0.19), language)} />
                    <InspectorKeyValue label="Total TTC Estimé" value={formatMoney(m.commissionEstimatedTtcDzd, language)} tone="accent" isLast />
                  </InspectorCard>
                </InspectorSection>
              </>
            )}
          </div>
        )}
      />

      {isMandateModalOpen && (
        <MandateModal
          isOpen={isMandateModalOpen}
          onClose={() => setIsMandateModalOpen(false)}
          onSave={(newMnd) => addMandate(newMnd)}
          properties={properties}
        />
      )}
    </div>
  );
};
