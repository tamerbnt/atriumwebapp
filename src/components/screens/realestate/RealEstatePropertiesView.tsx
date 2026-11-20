import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Building2,
  Plus,
  Key,
  Edit,
  Pin,
  MapPin,
  Eye,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { RealEstateProperty } from '../../../types';
import { useRealEstateData } from './realEstateData';
import { RealEstatePropertyModal } from './RealEstatePropertyModal';
import { RealEstateLeaseModal } from './RealEstateLeaseModal';
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
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  KineticEmptyStateMotion,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const RealEstatePropertiesView: React.FC<any> = () => {
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

  const { properties, leases, addProperty, updateProperty, deleteProperty, addLease } = useRealEstateData();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [listingFilter, setListingFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['prop_01']));
  const [sortBy, setSortBy] = useState<string>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<RealEstateProperty | null>(null);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  const [leaseProperty, setLeaseProperty] = useState<RealEstateProperty | null>(null);

  const [selectedProperty, setSelectedProperty] = useState<RealEstateProperty | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('fiche');
  const [inspectorNotes, setInspectorNotes] = useState<string>('');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeProperty = useMemo(() => {
    if (!selectedProperty) return null;
    return properties.find((p) => p.id === selectedProperty.id) || selectedProperty;
  }, [selectedProperty, properties]);

  const propertyLeaseMap = useMemo(() => {
    const map = new Map<string, (typeof leases)[number]>();
    leases.forEach((l) => map.set(l.propertyId, l));
    return map;
  }, [leases]);

  const rentedCount = useMemo(() => properties.filter((p) => p.status === 'Rented').length, [properties]);
  const availableCount = useMemo(() => properties.filter((p) => p.status === 'Available').length, [properties]);
  const occupancyRate = properties.length > 0 ? Math.round((rentedCount / properties.length) * 100) : 0;

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    properties.forEach((p) => {
      const b = resolveRecordBranch(p, branchesById, currentBranch, language);
      const key = b.id || b.name;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [properties, branchesById, currentBranch, language]);

  const branchOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: properties.length },
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
        count: branchCounts.get(currentBranch.id) || properties.length,
      });
    }
    return opts;
  }, [branches, currentBranch, branchCounts, properties.length, isAr, isEn]);

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (typeFilter !== 'All' && p.propertyType !== typeFilter) return false;
      if (listingFilter !== 'All' && p.listingType !== listingFilter) return false;
      if (branchFilter !== 'All') {
        const b = resolveRecordBranch(p, branchesById, currentBranch, language);
        if ((b.id || b.name) !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const b = resolveRecordBranch(p, branchesById, currentBranch, language);
        const matches =
          p.title.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.cityWilaya.toLowerCase().includes(q) ||
          p.ownerName.toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [properties, statusFilter, typeFilter, listingFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedProperties = useMemo(() => {
    const list = [...filteredProperties];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      let cmp = 0;
      if (sortBy === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortBy === 'price') cmp = a.priceDzd - b.priceDzd;
      else if (sortBy === 'surface') cmp = a.surfaceM2 - b.surfaceM2;
      else if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredProperties, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleOpenAdd = useCallback(() => {
    setPropertyToEdit(null);
    setIsPropertyModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((p: RealEstateProperty) => {
    setPropertyToEdit(p);
    setIsPropertyModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (p: RealEstateProperty) => {
      deleteProperty(p.id);
      if (selectedProperty?.id === p.id) setSelectedProperty(null);
      showToast(isAr ? 'تم حذف العقار من المحفظة' : 'Bien immobilier retiré du portefeuille', 'success');
    },
    [deleteProperty, selectedProperty?.id, isAr]
  );

  const handleBulkDelete = useCallback(
    (ids: Set<string>) => {
      ids.forEach((id) => deleteProperty(id));
      if (selectedProperty && ids.has(selectedProperty.id)) setSelectedProperty(null);
      setSelectedIds(new Set());
      showToast(isAr ? 'تم حذف العقارات المحددة' : 'Biens sélectionnés supprimés', 'success');
    },
    [deleteProperty, selectedProperty, isAr]
  );

  const handleTogglePin = useCallback((item: RealEstateProperty) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }, []);

  const handleSelectProperty = useCallback((p: RealEstateProperty, openerEl?: HTMLElement | null) => {
    setSelectedProperty(p);
    setDrawerOpenerEl(openerEl || null);
    setActiveTab('fiche');
    setInspectorNotes("Bien sous mandat d'agence. Clés disponibles pour visites. État des lieux initial conforme.");
  }, []);

  const handleOpenNewLease = useCallback((p: RealEstateProperty) => {
    setLeaseProperty(p);
    setIsLeaseModalOpen(true);
  }, []);

  const handleSaveNotes = (val: string) => {
    setInspectorNotes(val);
    showToast(isAr ? 'تم حفظ ملاحظات العقار' : 'Observations de gestion enregistrées', 'success');
  };

  const handleExportCSV = useCallback(() => {
    const headers = [
      'ID',
      'Titre',
      'Type',
      'Opération',
      'Branche',
      'Surface (m²)',
      'Pièces',
      'Adresse',
      'Wilaya',
      'Prix/Loyer (DZD)',
      'Statut',
      'Bailleur',
      'Téléphone',
    ];
    const rows = sortedProperties.map((p) => {
      const b = resolveRecordBranch(p, branchesById, currentBranch, language);
      return [
        p.id,
        p.title,
        p.propertyType,
        p.listingType,
        b.name,
        p.surfaceM2,
        p.roomsCount,
        p.address,
        p.cityWilaya,
        p.priceDzd,
        p.status,
        p.ownerName,
        p.ownerPhone,
      ];
    });
    downloadCsvSafe(`realestate_properties_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast(isAr ? 'تم تصدير محفظة العقارات' : 'Export CSV du portefeuille immobilier terminé', 'info');
  }, [sortedProperties, branchesById, currentBranch, language, isAr]);

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (typeFilter !== 'All') c++;
    if (listingFilter !== 'All') c++;
    if (branchFilter !== 'All') c++;
    return c;
  }, [typeFilter, listingFilter, branchFilter]);

  const hasAnyFilters = statusFilter !== 'All' || typeFilter !== 'All' || listingFilter !== 'All' || branchFilter !== 'All' || searchQuery.trim().length > 0;

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('All');
    setTypeFilter('All');
    setListingFilter('All');
    setBranchFilter('All');
  }, []);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (statusFilter !== 'All') {
      chips.push({
        key: 'status',
        label: statusFilter === 'Rented' ? (isAr ? 'مؤجر' : 'Loué') : (isAr ? 'شاغر' : 'Disponible'),
        onRemove: () => setStatusFilter('All'),
      });
    }
    if (typeFilter !== 'All') {
      chips.push({ key: 'type', label: typeFilter, onRemove: () => setTypeFilter('All') });
    }
    if (listingFilter !== 'All') {
      chips.push({
        key: 'listing',
        label: listingFilter === 'Rental' ? (isAr ? 'كراء' : 'Location') : (isAr ? 'بيع' : 'Vente'),
        onRemove: () => setListingFilter('All'),
      });
    }
    if (branchFilter !== 'All') {
      const bLabel = branchOptions.find((b) => b.value === branchFilter)?.label || branchFilter;
      chips.push({ key: 'branch', label: bLabel, onRemove: () => setBranchFilter('All') });
    }
    return chips;
  }, [statusFilter, typeFilter, listingFilter, branchFilter, branchOptions, isAr]);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'type',
        label: isAr ? 'نوع العقار' : isEn ? 'Property Type' : 'Type de Bien',
        value: typeFilter,
        onChange: setTypeFilter,
        kind: 'tiles',
        columns: 3,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Tous', count: properties.length },
          { value: 'Apartment', label: isAr ? 'شقق' : 'Appartement', count: properties.filter((p) => p.propertyType === 'Apartment').length },
          { value: 'Villa', label: isAr ? 'فيلات' : 'Villa', count: properties.filter((p) => p.propertyType === 'Villa').length },
          { value: 'Office', label: isAr ? 'مكاتب' : 'Bureaux', count: properties.filter((p) => p.propertyType === 'Office').length },
          { value: 'Commercial', label: isAr ? 'تجاري' : 'Commercial', count: properties.filter((p) => p.propertyType === 'Commercial').length },
          { value: 'Land', label: isAr ? 'أرض' : 'Terrain', count: properties.filter((p) => p.propertyType === 'Land').length },
        ],
      },
      {
        id: 'listing',
        label: isAr ? 'نوع العملية' : isEn ? 'Operation' : 'Opération',
        value: listingFilter,
        onChange: setListingFilter,
        kind: 'segmented',
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Toutes', count: properties.length },
          { value: 'Rental', label: isAr ? 'إيجار' : 'Location', count: properties.filter((p) => p.listingType === 'Rental').length },
          { value: 'Sale', label: isAr ? 'بيع' : 'Vente', count: properties.filter((p) => p.listingType === 'Sale').length },
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
    [typeFilter, listingFilter, branchFilter, properties, branchOptions, isAr, isEn]
  );

  const columns: ColumnDefinition<RealEstateProperty>[] = useMemo(
    () => [
      {
        key: 'title',
        header: isAr ? 'العقار / الوحدة' : 'Bien & Localisation',
        width: '3.2*',
        sortable: true,
        renderCell: (p) => {
          const isPinned = pinnedIds.has(p.id);
          return (
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 text-[#d4522f] font-bold text-xs flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700 shadow-2xs">
                <Building2 size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-black dark:text-white truncate">{p.title}</span>
                  {isPinned && <span className="text-[10px] text-amber-500 font-bold">📌 VIP</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-black/55 dark:text-white/55 font-mono">
                  <span>{p.cityWilaya}</span>
                  <span>·</span>
                  <span>{p.surfaceM2} m²</span>
                  <span>·</span>
                  <span>{p.roomsCount} {isAr ? 'غرف' : 'pièces'}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'owner',
        header: isAr ? 'المالك / الاتصال' : 'Bailleur & Contact',
        width: '2.2*',
        renderCell: (p) => (
          <div>
            <div className="text-xs font-semibold text-black dark:text-white truncate">{p.ownerName}</div>
            <div className="text-[11px] font-mono text-black/55 dark:text-white/55 mt-0.5">{p.ownerPhone}</div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الوكالة' : isEn ? 'Branch' : 'Agence',
        width: '1.8*',
        sortable: true,
        renderCell: (p) => {
          const b = resolveRecordBranch(p, branchesById, currentBranch, language);
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
        header: isAr ? 'السعر / الإيجار' : 'Loyer / Prix',
        width: '2.0*',
        sortable: true,
        renderCell: (p) => (
          <div>
            <span className="text-xs font-mono font-bold text-[#d4522f]">{formatMoney(p.priceDzd, language)}</span>
            <div className="text-[10px] text-black/55 dark:text-white/55">
              {p.listingType === 'Rental' ? (isAr ? '/ شهر' : '/ mois') : (isAr ? 'بيع' : 'Vente')}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : 'Statut',
        width: '1.8*',
        sortable: true,
        renderCell: (p) => {
          const isRented = p.status === 'Rented';
          return (
            <div className="text-center">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${
                  isRented
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200/60'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isRented ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                {isRented ? (isAr ? 'مؤجر' : 'Loué') : isAr ? 'شاغر' : 'Disponible'}
              </span>
            </div>
          );
        },
      },
    ],
    [pinnedIds, branchesById, currentBranch, language, isAr, isEn]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: properties.length > 0,
  });

  if (showSkeleton && (properties.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '1.5*', minWidth: '120px' },
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

  const activeBranchInfo = activeProperty ? resolveRecordBranch(activeProperty, branchesById, currentBranch, language) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Building2 size={22} />}
        title={isAr ? 'العقارات' : isEn ? 'Properties' : 'Biens Immobiliers'}
        primaryAction={{
          label: isAr ? 'إضافة عقار' : isEn ? 'New Property' : 'Nouveau Bien',
          onClick: handleOpenAdd,
          icon: <Plus size={16} strokeWidth={2.2} />,
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات المحفظة العقارية ونسبة الإشغال' : "Indicateurs de Portefeuille & Taux d'Occupation"}
        language={language}
        primaryCard={{
          label: isAr ? 'شاغرة متاحة' : isEn ? 'Available Lots' : 'Biens Disponibles',
          badgeText: isAr ? 'جاهز للتأجير/البيع' : 'Disponibles',
          count: availableCount,
          tone: 'emerald',
          isActive: statusFilter === 'Available',
          onToggle: () => setStatusFilter((prev) => (prev === 'Available' ? 'All' : 'Available')),
        }}
        secondaryCard={{
          label: isAr ? 'وحدات مؤجرة' : isEn ? 'Rented Units' : 'Biens Loués',
          badgeText: isAr ? 'عقد سارٍ' : 'Sous bail actif',
          count: rentedCount,
          tone: 'terracotta',
          isActive: statusFilter === 'Rented',
          onToggle: () => setStatusFilter((prev) => (prev === 'Rented' ? 'All' : 'Rented')),
        }}
        darkCard={{
          label: isAr ? 'نسبة الإشغال والتوثيق' : 'Taux Occupation & Sécurité',
          badgeCount: properties.length,
          badgePrefix: '',
          badgeSuffix: isAr ? 'عقار' : 'lots',
          valueCount: occupancyRate,
          valuePrefix: '',
          valueSuffix: '%',
          caption: isAr ? 'عقود موثقة وضمانات محفوظة' : 'Baux notariés & cautions séquestrées',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'دليل العقارات' : isEn ? 'Property Portfolio' : 'Inventaire Immobilier'}
          liveRegionText={`${sortedProperties.length} ${isAr ? 'عقار' : 'biens'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={isAr ? 'بحث بالاسم، المدينة، المالك...' : 'Recherche bien, quartier, bailleur...'}
          statusOptions={[
            { value: 'All', label: isAr ? 'الكل' : 'Tous', count: properties.length },
            { value: 'Available', label: isAr ? 'شاغر' : 'Disponibles', count: availableCount },
            { value: 'Rented', label: isAr ? 'مؤجر' : 'Loués', count: rentedCount },
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
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={resetAllFilters}
        />

        <UniversalDataCollection
          hideToolbar
          items={sortedProperties}
          keyExtractor={(p) => p.id}
          defaultViewMode="list"
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          columns={columns}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(key, dir) => {
            setSortBy(key);
            setSortDir(dir);
          }}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onBulkDelete={handleBulkDelete}
          isPinned={(p) => pinnedIds.has(p.id)}
          onTogglePin={handleTogglePin}
          openItemId={activeProperty?.id}
          onItemClick={handleSelectProperty}
          onViewDetails={handleSelectProperty}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          getRowMeta={(p): Partial<KineticRowData> => {
            const bInfo = resolveRecordBranch(p, branchesById, currentBranch, language);
            const isRented = p.status === 'Rented';
            return {
              title: p.title,
              subline: `${p.cityWilaya} · ${p.surfaceM2} m² · ${p.roomsCount} ${isAr ? 'غرف' : 'pièces'}`,
              avatarText: (p.title || 'RE').slice(0, 2).toUpperCase(),
              avatarColor: '#d4522f',
              categoryLabel: p.propertyType,
              branchName: bInfo.name,
              branchCode: bInfo.code,
              isPinned: pinnedIds.has(p.id),
              statusLabel: isRented ? (isAr ? 'مؤجر' : 'Loué') : isAr ? 'شاغر' : 'Disponible',
              statusVariant: isRented ? 'info' : 'active',
              metricPrimary: formatMoney(p.priceDzd, language),
              metricSecondary: p.listingType === 'Rental' ? '/ mois' : 'Vente',
              detailCol1: { heading: isAr ? 'المالك' : 'Bailleur', primaryText: p.ownerName },
              detailCol2: { heading: isAr ? 'المساحة' : 'Surface', primaryText: `${p.surfaceM2} m²` },
              detailCol3: { heading: isAr ? 'العملية' : 'Opération', primaryText: p.listingType === 'Rental' ? 'Location' : 'Vente' },
            };
          }}
          getFanActions={(p): KineticRowFanAction[] => [
            {
              id: 'lease',
              label: isAr ? 'عقد إيجار' : 'Nouveau Bail',
              icon: <Key size={14} />,
              onClick: (e) => {
                e.stopPropagation();
                handleOpenNewLease(p);
              },
            },
            {
              id: 'edit',
              label: isAr ? 'تعديل' : 'Modifier',
              icon: <Edit size={14} />,
              onClick: (e) => {
                e.stopPropagation();
                handleOpenEdit(p);
              },
            },
            {
              id: 'inspect',
              label: isAr ? 'عرض' : 'Détails',
              icon: <Eye size={14} />,
              onClick: (e) => {
                e.stopPropagation();
                handleSelectProperty(p, e.currentTarget);
              },
            },
          ]}
          getDetailActions={(p): KineticDetailAction[] => [
            {
              id: 'lease',
              label: isAr ? 'عقد إيجار' : 'Nouveau Bail',
              icon: <Key size={14} />,
              onClick: () => handleOpenNewLease(p),
            },
            {
              id: 'edit',
              label: isAr ? 'تعديل' : 'Modifier',
              icon: <Edit size={14} />,
              onClick: () => handleOpenEdit(p),
            },
          ]}
          emptyTitle={isAr ? 'لا توجد عقارات مطابقة' : 'Aucun bien immobilier'}
          emptyDescription={
            isAr
              ? 'أضف أول عقار للمحفظة أو أعد ضبط معايير البحث'
              : 'Ajoutez un premier bien ou modifiez vos filtres de recherche'
          }
          primaryActionLabel={isAr ? 'إضافة عقار' : 'Nouveau Bien'}
          onAddFirstItem={handleOpenAdd}
          onResetFilters={resetAllFilters}
          hasActiveFilters={hasAnyFilters}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedProperties.length}
        entityPluralLabel={isAr ? 'عقار' : isEn ? 'properties' : 'biens'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setTypeFilter('All');
          setListingFilter('All');
          setBranchFilter('All');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activeProperty)}
        item={activeProperty}
        allItems={sortedProperties}
        keyExtractor={(p) => p.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeProperty?.title || ''}
        subtitle={activeProperty ? `${activeProperty.propertyType} · ${formatMoney(activeProperty.priceDzd, language)}` : ''}
        avatarText={activeProperty?.title?.slice(0, 2).toUpperCase() || 'RE'}
        avatarColor="#d4522f"
        branchName={activeBranchInfo?.name}
        statusLabel={
          activeProperty?.status === 'Rented'
            ? isAr ? 'مؤجر' : 'Loué'
            : isAr ? 'شاغر متاح' : 'Disponible'
        }
        statusClassName={
          activeProperty?.status === 'Rented'
            ? 'bg-[#DBEAFE] dark:bg-[#172554] text-[#1D4ED8] dark:text-[#93C5FD] border border-[#BFDBFE] dark:border-[#1E3A8A]'
            : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
        }
        tabs={[
          { id: 'fiche', label: isAr ? 'بيانات العقار' : 'Fiche & Cadastre' },
          { id: 'owner', label: isAr ? 'المالك' : 'Bailleur' },
          { id: 'leases', label: isAr ? 'عقود الإيجار' : 'Baux & Gestion' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(p) => handleSelectProperty(p)}
        onClose={() => setSelectedProperty(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(prop, tab) => {
          const activeLeaseForProp = propertyLeaseMap.get(prop.id);
          return (
            <div className="space-y-4">
              <InspectorSection index={0}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'lease',
                      label: isAr ? 'عقد إيجار' : 'Nouveau Bail',
                      icon: <Key size={16} />,
                      primary: true,
                      onClick: () => handleOpenNewLease(prop),
                    },
                    {
                      id: 'edit',
                      label: isAr ? 'تعديل' : 'Modifier',
                      icon: <Edit size={16} />,
                      onClick: () => handleOpenEdit(prop),
                    },
                    {
                      id: 'pin',
                      label: pinnedIds.has(prop.id) ? (isAr ? 'مثبت' : 'Épinglé') : (isAr ? 'تثبيت' : 'Épingler'),
                      icon: <Pin size={16} />,
                      onClick: () => handleTogglePin(prop),
                    },
                  ]}
                />
              </InspectorSection>

              {tab === 'fiche' && (
                <>
                  <InspectorSection index={1} title={isAr ? 'القيمة' : 'Tarification'}>
                    <InspectorBigStat
                      value={formatMoney(prop.priceDzd, language)}
                      tone="accent"
                      caption={`${prop.propertyType} · ${prop.surfaceM2} m² · ${prop.roomsCount} ${isAr ? 'غرف' : 'pièces'}`}
                    />
                  </InspectorSection>
                  <InspectorSection index={2} title={isAr ? 'المواصفات الفنية' : 'Caractéristiques & Cadastre'}>
                    <InspectorCard>
                      <InspectorKeyValue label={isAr ? 'النوع' : 'Type de bien'} value={prop.propertyType} mono={false} />
                      <InspectorKeyValue label={isAr ? 'المساحة' : 'Superficie'} value={`${prop.surfaceM2} m²`} />
                      <InspectorKeyValue label={isAr ? 'الغرف' : 'Pièces'} value={String(prop.roomsCount)} />
                      <InspectorKeyValue label={isAr ? 'العنوان' : 'Adresse'} value={prop.address} mono={false} />
                      <InspectorKeyValue
                        label={isAr ? 'الولاية' : 'Ville & Wilaya'}
                        value={prop.cityWilaya}
                        mono={false}
                        isLast={!prop.legalTitleType && !prop.livretFoncierNumber}
                      />
                      {prop.legalTitleType && (
                        <InspectorKeyValue
                          label="Nature Titre"
                          value={prop.legalTitleType.replace(/_/g, ' ')}
                          mono={false}
                          isLast={!prop.livretFoncierNumber}
                        />
                      )}
                      {prop.livretFoncierNumber && (
                        <InspectorKeyValue label="Livret Foncier" value={prop.livretFoncierNumber} copyText={prop.livretFoncierNumber} isLast />
                      )}
                    </InspectorCard>
                  </InspectorSection>
                </>
              )}

              {tab === 'owner' && (
                <InspectorSection index={1} title={isAr ? 'بيانات المالك' : 'Coordonnées Propriétaire'}>
                  <InspectorCard>
                    <InspectorKeyValue label={isAr ? 'الاسم الكامل' : 'Nom du bailleur'} value={prop.ownerName} mono={false} />
                    <InspectorKeyValue
                      label={isAr ? 'الهاتف' : 'Téléphone'}
                      value={prop.ownerPhone}
                      copyText={prop.ownerPhone}
                      isLast={!prop.ownerNationalId}
                    />
                    {prop.ownerNationalId && (
                      <InspectorKeyValue label="CNI / NIF" value={prop.ownerNationalId} copyText={prop.ownerNationalId} isLast />
                    )}
                  </InspectorCard>
                </InspectorSection>
              )}

              {tab === 'leases' && (
                <>
                  <InspectorSection index={1} title={isAr ? 'عقود الإيجار' : 'Bail Locatif Associé'}>
                      {activeLeaseForProp ? (
                        <InspectorCard>
                          <InspectorListItem
                            title={activeLeaseForProp.tenantName}
                            subtitle={`${activeLeaseForProp.startDate} → ${activeLeaseForProp.endDate}`}
                            metaRight={formatMoney(activeLeaseForProp.monthlyRentDzd, language)}
                            badge={{ label: isAr ? 'عقد سارٍ' : 'Bail Actif', tone: 'ok' }}
                            isLast
                          />
                        </InspectorCard>
                      ) : (
                        <KineticEmptyStateMotion motionKey={`re-prop-${prop.id}`}>
                          <EmptyState
                            variant="compact"
                            icon={<Key />}
                            title={isAr ? 'لا يوجد عقد إيجار' : 'Aucun bail actif'}
                            description={isAr ? 'يمكنك تحرير عقد جديد من الأعلى' : 'Créez un bail via les actions rapides'}
                          />
                        </KineticEmptyStateMotion>
                      )}
                  </InspectorSection>
                  <InspectorSection index={2} title={isAr ? 'ملاحظات الوكالة' : "Observations d'Agence"}>
                    <InspectorNotesField
                      value={inspectorNotes}
                      onSave={handleSaveNotes}
                      placeholder={isAr ? 'أدخل ملاحظات الوكالة...' : 'Disponibilité des clés, travaux à prévoir...'}
                    />
                  </InspectorSection>
                </>
              )}
            </div>
          );
        }}
      />

      {isPropertyModalOpen && (
        <RealEstatePropertyModal
          isOpen={isPropertyModalOpen}
          onClose={() => {
            setIsPropertyModalOpen(false);
            setPropertyToEdit(null);
          }}
          propertyToEdit={propertyToEdit}
          onSave={(p) => {
            if (propertyToEdit) {
              updateProperty(p);
              if (selectedProperty?.id === p.id) setSelectedProperty(p);
              showToast(isAr ? 'تم تحديث بيانات العقار' : 'Bien immobilier mis à jour', 'success');
            } else {
              addProperty(p);
              showToast(isAr ? 'تم إضافة العقار بنجاح' : 'Bien immobilier ajouté avec succès', 'success');
            }
            setIsPropertyModalOpen(false);
            setPropertyToEdit(null);
          }}
        />
      )}

      {isLeaseModalOpen && leaseProperty && (
        <RealEstateLeaseModal
          isOpen={isLeaseModalOpen}
          onClose={() => {
            setIsLeaseModalOpen(false);
            setLeaseProperty(null);
          }}
          properties={[leaseProperty]}
          onSave={(lease) => {
            addLease(lease);
            const updated: RealEstateProperty = { ...leaseProperty, status: 'Rented' };
            updateProperty(updated);
            if (selectedProperty?.id === leaseProperty.id) setSelectedProperty(updated);
            setIsLeaseModalOpen(false);
            setLeaseProperty(null);
            showToast(isAr ? 'تم تحرير عقد الإيجار بنجاح' : 'Bail locatif enregistré avec succès', 'success');
          }}
        />
      )}
    </div>
  );
};
