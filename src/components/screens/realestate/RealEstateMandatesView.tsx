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
} from 'lucide-react';
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { MandateModal } from './MandateModal';
import { useRealEstateData } from './realEstateData';
import { RealEstateMandate } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { useAtriumStore, showToast } from '../../../services/store';
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
      showToast(
        isAr
          ? `تم تمديد الوكالة ${mandate.mandateNumber} لـ 3 أشهر إضافية`
          : `Avenant validé: Mandat ${mandate.mandateNumber} prorogé de 3 mois jusqu'au ${newEnd}`,
        'success'
      );
    },
    [updateMandate, selectedMandate?.id, isAr]
  );

  const handleDelete = useCallback(
    (m: RealEstateMandate) => {
      deleteMandate(m.id);
      if (selectedMandate?.id === m.id) setSelectedMandate(null);
      showToast(isAr ? 'تم سحب الوكالة' : 'Mandat archivé / supprimé', 'success');
    },
    [deleteMandate, selectedMandate?.id, isAr]
  );

  const handleBulkDelete = useCallback(
    (ids: Set<string>) => {
      ids.forEach((id) => deleteMandate(id));
      if (selectedMandate && ids.has(selectedMandate.id)) setSelectedMandate(null);
      setSelectedIds(new Set());
      showToast(isAr ? 'تم حذف الوكالات المحددة' : 'Mandats sélectionnés supprimés', 'success');
    },
    [deleteMandate, selectedMandate, isAr]
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
            <div className="font-mono font-bold text-xs text-[#d4522f] flex items-center gap-1.5">
              <span>{m.mandateNumber}</span>
              {m.isExclusive && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-[#d4522f]/15 text-[#d4522f]">
                  Exclusif
                </span>
              )}
            </div>
            <div className="text-xs font-semibold text-black dark:text-white truncate mt-0.5">{m.propertyTitle}</div>
            <div className="text-[11px] text-black/55 dark:text-white/75 truncate">{m.propertyAddress}</div>
          </div>
        ),
      },
      {
        key: 'owner',
        header: isAr ? 'الموكل (المالك)' : 'Mandant (Propriétaire)',
        width: '2.0*',
        renderCell: (m) => (
          <div className="text-xs">
            <div className="font-semibold text-black dark:text-white truncate">{m.ownerFullName}</div>
            <div className="text-black/55 dark:text-white/75 font-mono">{m.ownerPhone}</div>
            <div className="text-[10px] text-black/55 dark:text-white/55 font-mono">CNI: {m.ownerNationalId}</div>
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
            <div className="text-xs font-medium text-black/75 dark:text-white/75 truncate flex items-center gap-1.5">
              <MapPin size={12} className="text-[#d4522f] shrink-0" />
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
          <div className="text-xs">
            <div className="font-mono font-bold text-black dark:text-white">{formatMoney(m.askingPriceDzd, language)}</div>
            <div className="text-[11px] text-black/55 dark:text-white/75 mt-0.5">
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
          <div className="text-xs">
            <div className="font-mono font-bold text-[#d4522f]">{formatMoney(m.commissionEstimatedTtcDzd, language)}</div>
            <div className="text-[11px] text-black/55 dark:text-white/75">
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
          <div className="text-xs">
            <div className="text-black dark:text-white flex items-center gap-1 font-mono">
              <Calendar className="w-3.5 h-3.5 text-black/55 dark:text-white/55" />
              <span>{m.endDate}</span>
            </div>
            {m.status === 'Expiring' ? (
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-3 h-3" />
                <span>Expire &lt;15j</span>
              </span>
            ) : (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
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
        subtitle={
          isAr
            ? `مطابق للمرسوم التنفيذي 09-18 · ${exclusiveCount} وكالة حصرية`
            : `Registre officiel Décret 09-18 · ${exclusiveCount} mandats exclusifs`
        }
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
          data={sortedMandates}
          keyExtractor={(m) => m.id}
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
          onBulkDelete={handleBulkDelete}
          isPinned={(m) => pinnedIds.has(m.id)}
          onTogglePin={handleTogglePin}
          openItemId={activeMandate?.id}
          onItemClick={handleOpenInspector}
          onViewDetails={handleOpenInspector}
          onDelete={handleDelete}
          customActions={(item) => [
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
          renderCard={(m) => (
            <div className="p-1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-[#d4522f]">{m.mandateNumber}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    m.status === 'Expiring'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {m.status}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-black dark:text-white truncate">{m.propertyTitle}</h4>
                <p className="text-xs text-black/55 dark:text-white/55 truncate">
                  {m.ownerFullName} • {m.ownerPhone}
                </p>
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-black/55 dark:text-white/55 block">Prix Demandé</span>
                  <span className="font-mono font-bold text-black dark:text-white">{formatMoney(m.askingPriceDzd, language)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-black/55 dark:text-white/55 block">Com. TTC (09-18)</span>
                  <span className="font-mono font-bold text-[#d4522f]">{formatMoney(m.commissionEstimatedTtcDzd, language)}</span>
                </div>
              </div>
            </div>
          )}
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
        branchName={activeBranchInfo?.name}
        statusLabel={activeMandate?.status === 'Active' ? 'Actif & Conforme' : activeMandate?.status}
        statusClassName={
          activeMandate?.status === 'Expiring'
            ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
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
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <AtriumButton
                type="button"
                variant="primary"
                size="sm"
                icon={<Clock size={13} />}
                onClick={() => handleProrogation(m)}
              >
                Proroger 3 Mois (Avenant 09-18)
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="outline"
                size="sm"
                icon={<Printer size={13} />}
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
              >
                Imprimer Mandat
              </AtriumButton>
            </div>

            {tab === 'mandat' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-[#F3EDE7] dark:bg-neutral-800/60 border border-[#E6DED6] dark:border-neutral-700/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/75">Régime:</span>
                    <span className="font-semibold text-black dark:text-white">
                      {m.isExclusive ? 'Exclusivité Totale (3 Mois)' : 'Mandat Simple'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/75">Validité:</span>
                    <span className="font-mono text-black dark:text-white">
                      {m.startDate} → {m.endDate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-black/55 dark:text-white/75">Renouvellements:</span>
                    <span className="font-mono">{m.renewalCount} avenant(s)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E6DED6] dark:border-neutral-700/60 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase text-[#d4522f]">Bien Sous Contrat</div>
                  <div className="font-bold text-black dark:text-white">{m.propertyTitle}</div>
                  <div className="text-black/55 dark:text-white/75">{m.propertyAddress}</div>
                  <div className="pt-2 flex justify-between font-mono font-bold text-sm text-black dark:text-white">
                    <span>Prix Demandé:</span>
                    <span>{formatMoney(m.askingPriceDzd, language)}</span>
                  </div>
                  <div className="flex justify-between text-black/55 dark:text-white/55 text-[11px]">
                    <span>Seuil Minimal Négociable:</span>
                    <span className="font-mono">{formatMoney(m.minimumAcceptablePriceDzd, language)}</span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'mandant' && (
              <div className="p-3.5 rounded-xl border border-[#E6DED6] dark:border-neutral-700/60 space-y-2">
                <div className="text-[11px] font-bold uppercase text-[#d4522f]">Identité du Mandant</div>
                <div className="font-semibold text-black dark:text-white text-sm">{m.ownerFullName}</div>
                <div className="text-black/55 dark:text-white/75 font-mono">{m.ownerPhone}</div>
                <div className="text-[11px] text-black/55 dark:text-white/55">
                  CNI / Passeport: <span className="font-mono font-semibold text-black dark:text-white">{m.ownerNationalId}</span>
                </div>
                {m.ownerIdIssueDate && (
                  <div className="text-[11px] text-black/55 dark:text-white/55">
                    Délivré le {m.ownerIdIssueDate} à {m.ownerIdIssueDaira}
                  </div>
                )}
                {m.notes && (
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-black/70 dark:text-white/75">
                    {m.notes}
                  </div>
                )}
              </div>
            )}

            {tab === 'honoraires' && (
              <div className="p-4 rounded-xl bg-[#FDF4F0] dark:bg-neutral-800 border border-[#d4522f]/30 space-y-2">
                <div className="text-[11px] font-bold uppercase text-[#d4522f]">Honoraires Réglementés (Décret 09-18)</div>
                <div className="flex justify-between">
                  <span>Base HT:</span>
                  <span className="font-mono font-semibold">{formatMoney(m.commissionEstimatedHtDzd, language)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA Légale (19%):</span>
                  <span className="font-mono font-semibold">
                    {formatMoney(Math.round(m.commissionEstimatedHtDzd * 0.19), language)}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-[#d4522f]/30 font-bold text-sm text-[#d4522f]">
                  <span>Total TTC Estimé:</span>
                  <span className="font-mono">{formatMoney(m.commissionEstimatedTtcDzd, language)}</span>
                </div>
              </div>
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
