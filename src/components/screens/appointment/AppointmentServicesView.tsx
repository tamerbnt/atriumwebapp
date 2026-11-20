import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Scissors,
  Clock,
  Plus,
  Edit2,
  Trash2,
  X,
  Building2,
  Eye,
  Copy,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentServicesFromState,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import { ServiceItem } from '../../../types/index';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { formatMoney } from '../../../utils/rules';
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
  InspectorProgressBar,
  InspectorBigStat,
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const CATEGORY_LABELS: Record<string, string> = {
  Hair: 'Coiffure',
  Color: 'Colorimétrie',
  Spa: 'Soins & Spa',
  Nails: 'Onglerie Russe',
  Facial: 'Soins Visage',
  Bridal: 'Haute Mariée',
  Massage: 'Massages & Corps',
  Barber: 'Barbier',
};

export const AppointmentServicesView: React.FC = React.memo(() => {
  const {
    servicesCatalog,
    branches,
    currentBranch,
    language,
    isSyncing,
    networkMode,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumSelector(
    (s) => ({
      servicesCatalog: selectCurrentServicesFromState(s),
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

  const {
    addServiceItem,
    updateServiceItem,
    deleteServiceItem,
    batchDeleteServiceItems,
    retryCloudSync,
  } = useAtriumActions();

  const isAr = language === 'ar';
  const isEn = language === 'en';

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [tierFilter, setTierFilter] = useState<'All' | 'Hair' | 'Premium'>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(() => new Set());
  const [pinnedServiceIds, setPinnedServiceIds] = useState<Set<string>>(() => new Set());
  const [sortBy, setSortBy] = useState<string>('price');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [inspectingService, setInspectingService] = useState<ServiceItem | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ServiceItem['category']>('Hair');
  const [formDuration, setFormDuration] = useState(60);
  const [formPrice, setFormPrice] = useState(5000);
  const [formCostPrice, setFormCostPrice] = useState(500);
  const [formCommission, setFormCommission] = useState(40);
  const [formBuffer, setFormBuffer] = useState(10);
  const [formColor, setFormColor] = useState('#d4522f');
  const [formDescription, setFormDescription] = useState('');

  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const catalogMetrics = useMemo(() => {
    const list = servicesCatalog;
    const totalServices = list.length;
    const hairCount = list.filter((s) => {
      const cat = s.category as string;
      return cat === 'Hair' || cat === 'Color' || cat === 'Barber';
    }).length;
    const premiumCount = list.filter((s) => {
      const cat = s.category as string;
      return s.price >= 4500 || cat === 'Bridal' || cat === 'Spa';
    }).length;
    const avgPrice =
      totalServices > 0 ? Math.round(list.reduce((acc, s) => acc + s.price, 0) / totalServices) : 0;
    const avgDuration =
      totalServices > 0
        ? Math.round(list.reduce((acc, s) => acc + s.durationMinutes, 0) / totalServices)
        : 0;
    const totalValuation = list.reduce((acc, s) => acc + s.price, 0);
    const totalCost = list.reduce((acc, s) => acc + (s.costPrice || 0), 0);
    const avgGrossMargin =
      totalValuation > 0 ? Math.round(((totalValuation - totalCost) / totalValuation) * 100) : 0;
    const branchCounts = new Map<string, number>();
    list.forEach((s) => {
      const bName = resolveRecordBranch(s, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalServices,
      hairCount,
      premiumCount,
      avgPrice,
      avgDuration,
      avgGrossMargin,
      branchOptionsWithCounts: Array.from(branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    };
  }, [servicesCatalog, branchesById, currentBranch, language]);

  const filteredServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return servicesCatalog.filter((s) => {
      if (activeCategory !== 'All' && s.category !== activeCategory) return false;
      const cat = s.category as string;
      if (tierFilter === 'Hair' && cat !== 'Hair' && cat !== 'Color' && cat !== 'Barber') {
        return false;
      }
      if (tierFilter === 'Premium' && s.price < 4500 && cat !== 'Bridal' && cat !== 'Spa') {
        return false;
      }
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(s, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const bName = resolveRecordBranch(s, branchesById, currentBranch, language).name.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          bName.includes(q)
        );
      }
      return true;
    });
  }, [servicesCatalog, activeCategory, tierFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedServices = useMemo(() => {
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filteredServices].sort((a, b) => {
      const aPinned = pinnedServiceIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedServiceIds.has(b.id) ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * sign;
      if (sortBy === 'category') return a.category.localeCompare(b.category) * sign;
      if (sortBy === 'durationMinutes') return (a.durationMinutes - b.durationMinutes) * sign;
      if (sortBy === 'commissionRate') return ((a.commissionRate || 40) - (b.commissionRate || 40)) * sign;
      if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        return ba.localeCompare(bb) * sign;
      }
      return (a.price - b.price) * sign;
    });
  }, [filteredServices, pinnedServiceIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const handleOpenCreateModal = useCallback(() => {
    setEditingService(null);
    setFormName('');
    setFormCategory('Hair');
    setFormDuration(60);
    setFormPrice(5000);
    setFormCostPrice(500);
    setFormCommission(40);
    setFormBuffer(10);
    setFormColor('#d4522f');
    setFormDescription('');
    setIsServiceModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((service: ServiceItem) => {
    setEditingService(service);
    setFormName(service.name);
    setFormCategory(service.category);
    setFormDuration(service.durationMinutes);
    setFormPrice(service.price);
    setFormCostPrice(service.costPrice || 0);
    setFormCommission(service.commissionRate || 40);
    setFormBuffer(service.bufferMinutes || 0);
    setFormColor(service.color || '#d4522f');
    setFormDescription(service.description || '');
    setIsServiceModalOpen(true);
  }, []);

  const handleSaveService = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!formName.trim()) {
        showToast?.({ type: 'error', title: 'Nom requis', message: 'Saisissez le nom du soin.' });
        return;
      }
      if (editingService) {
        updateServiceItem(editingService.id, {
          name: formName.trim(),
          category: formCategory,
          durationMinutes: Number(formDuration),
          price: Number(formPrice),
          costPrice: Number(formCostPrice),
          commissionRate: Number(formCommission),
          bufferMinutes: Number(formBuffer),
          color: formColor,
          description: formDescription.trim(),
        });
      } else {
        addServiceItem({
          tenantId: 'acc_01',
          name: formName.trim(),
          category: formCategory,
          durationMinutes: Number(formDuration),
          price: Number(formPrice),
          costPrice: Number(formCostPrice),
          commissionRate: Number(formCommission),
          bufferMinutes: Number(formBuffer),
          color: formColor,
          colorCode: formColor,
          description: formDescription.trim(),
          isActive: true,
        });
      }
      setIsServiceModalOpen(false);
    },
    [
      formName,
      editingService,
      formCategory,
      formDuration,
      formPrice,
      formCostPrice,
      formCommission,
      formBuffer,
      formColor,
      formDescription,
      updateServiceItem,
      addServiceItem,
    ]
  );

  const handleBatchDelete = useCallback(() => {
    batchDeleteServiceItems(Array.from(selectedServiceIds));
    setSelectedServiceIds(new Set());
  }, [selectedServiceIds, batchDeleteServiceItems]);

  const handleExportCSV = useCallback(() => {
    const headers = [
      'Prestation',
      'Catégorie',
      'Durée (min)',
      'Tarif Client (DZD)',
      'Commission (%)',
      isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
    ];
    const rows = sortedServices.map((s) => [
      s.name,
      s.category,
      s.durationMinutes,
      s.price,
      s.commissionRate || 40,
      resolveRecordBranch(s, branchesById, currentBranch, language).name,
    ]);
    downloadCsvSafe(`atrium-salon-services-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }, [sortedServices, isAr, isEn, branchesById, currentBranch, language]);

  const handleResetFilters = useCallback(() => {
    setActiveCategory('All');
    setTierFilter('All');
    setBranchFilter('All');
    setSearchQuery('');
    setIsFilterModalOpen(false);
  }, []);

  const hasActiveAdvancedFilters = activeCategory !== 'All' || branchFilter !== 'All';
  const activeFiltersCount = (activeCategory !== 'All' ? 1 : 0) + (branchFilter !== 'All' ? 1 : 0);

  const statusOptions = useMemo(
    () => [
      { value: 'All', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: servicesCatalog.length },
      { value: 'Hair', label: isAr ? 'الشعر' : isEn ? 'Hair' : 'Coiffure', count: catalogMetrics.hairCount },
      { value: 'Premium', label: isAr ? 'متميزة' : isEn ? 'Signature' : 'Signature', count: catalogMetrics.premiumCount },
    ],
    [isAr, isEn, servicesCatalog.length, catalogMetrics.hairCount, catalogMetrics.premiumCount]
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
            count: servicesCatalog.length,
          },
          ...catalogMetrics.branchOptionsWithCounts,
        ],
      },
      {
        id: 'category',
        label: isAr ? 'الفئة' : isEn ? 'Category' : 'Catégorie',
        value: activeCategory,
        onChange: setActiveCategory,
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Toutes' },
          { value: 'Hair', label: 'Coiffure' },
          { value: 'Nails', label: 'Onglerie' },
          { value: 'Facial', label: 'Visage' },
          { value: 'Bridal', label: 'Mariée' },
          { value: 'Massage', label: 'Spa & Corps' },
          { value: 'Barber', label: 'Barbier' },
        ],
      },
    ],
    [isAr, isEn, branchFilter, servicesCatalog.length, catalogMetrics.branchOptionsWithCounts, activeCategory]
  );

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') chips.push({ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') });
    if (activeCategory !== 'All') {
      chips.push({
        key: 'cat',
        label: CATEGORY_LABELS[activeCategory] || activeCategory,
        onRemove: () => setActiveCategory('All'),
      });
    }
    return chips;
  }, [branchFilter, activeCategory]);

  const columns: ColumnDefinition<ServiceItem>[] = useMemo(
    () => [
      {
        key: 'name',
        header: isAr ? 'الخدمة والعناية' : isEn ? 'Service' : 'Prestation / Soin',
        sortable: true,
        renderCell: (service) => (
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: service.color || '#d4522f' }}
            />
            <div className="min-w-0">
              <span className="t-label font-semibold text-black dark:text-white truncate block">
                {service.name}
              </span>
              <span className="t-cap text-black/62 dark:text-white/65 truncate block">
                {CATEGORY_LABELS[service.category] || service.category}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'durationMinutes',
        header: isAr ? 'المدة والعمولة' : isEn ? 'Duration & Comm.' : 'Durée & Comm.',
        sortable: true,
        renderCell: (service) => (
          <div className="t-cap tabular-nums">
            <span className="font-semibold text-black dark:text-white block">
              {service.durationMinutes} min
              {service.bufferMinutes ? ` (+${service.bufferMinutes}m)` : ''}
            </span>
            <span className="t-small font-semibold text-emerald-600 dark:text-emerald-400 block">
              {service.commissionRate || 40}% commission
            </span>
          </div>
        ),
      },
      {
        key: 'price',
        header: isAr ? 'التعريفة' : isEn ? 'Client Price' : 'Tarif Client',
        sortable: true,
        renderCell: (service) => (
          <div className="tabular-nums">
            <span className="t-label font-semibold tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] block">
              {formatMoney(service.price)}
            </span>
            <span className="t-cap text-black/62 dark:text-white/65 tabular-nums block">
              Coût: {formatMoney(service.costPrice || 0)}
            </span>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isEn ? 'Branch' : 'Branche',
        sortable: true,
        renderCell: (service) => (
          <span className="t-small font-medium text-black/80 dark:text-white/85 truncate block">
            {resolveRecordBranch(service, branchesById, currentBranch, language).name}
          </span>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
  );

  const getRowMeta = useCallback(
    (service: ServiceItem): Partial<KineticRowData> => {
      const branch = resolveRecordBranch(service, branchesById, currentBranch, language);
      const margin = service.price > 0 ? Math.round(((service.price - (service.costPrice || 0)) / service.price) * 100) : 100;
      return {
        subline: `${CATEGORY_LABELS[service.category] || service.category} · ${service.durationMinutes} min`,
        categoryLabel: CATEGORY_LABELS[service.category] || service.category,
        statusLabel: `${service.commissionRate || 40}% comm.`,
        statusVariant: service.price >= 4500 ? 'warning' : 'active',
        metricPrimary: formatMoney(service.price),
        metricSecondary: `${margin}% marge`,
        detailCol1: {
          heading: isAr ? 'التصنيف والمدة' : 'Protocole & Durée',
          primaryText: `${service.durationMinutes} min`,
          secondaryText: service.bufferMinutes ? `+${service.bufferMinutes} min tampon` : 'Sans tampon',
          tertiaryText: branch.name,
        },
        detailCol2: {
          heading: isAr ? 'التكلفة والهامش' : 'Rentabilité',
          primaryText: `${margin}% marge brute`,
          secondaryText: `Coût: ${formatMoney(service.costPrice || 0)}`,
        },
        detailCol3: {
          heading: isAr ? 'العمولة' : 'Commission',
          primaryText: `${service.commissionRate || 40}% styliste`,
          secondaryText: formatMoney(Math.round((service.price * (service.commissionRate || 40)) / 100)),
        },
      };
    },
    [branchesById, currentBranch, language, isAr]
  );

  const getFanActions = useCallback(
    (service: ServiceItem): KineticRowFanAction[] => [
      {
        id: 'edit',
        label: isAr ? 'تعديل' : 'Modifier',
        icon: <Edit2 className="w-[15px] h-[15px]" />,
        onClick: () => handleOpenEditModal(service),
      },
      {
        id: 'view',
        label: isAr ? 'معاينة' : 'Fiche',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setInspectingService(service);
        },
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : 'Supprimer',
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () => {
          deleteServiceItem(service.id);
          if (inspectingService?.id === service.id) setInspectingService(null);
        },
      },
    ],
    [isAr, handleOpenEditModal, deleteServiceItem, inspectingService?.id]
  );

  const getDetailActions = useCallback(
    (service: ServiceItem): KineticDetailAction[] => [
      {
        id: 'view',
        label: 'Détails',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => setInspectingService(service),
      },
      {
        id: 'edit',
        label: 'Modifier',
        icon: <Edit2 className="w-3.5 h-3.5 text-[#096b40]" />,
        onClick: () => handleOpenEditModal(service),
      },
    ],
    [handleOpenEditModal]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: servicesCatalog.length > 0,
  });

  if (showSkeleton && (servicesCatalog.length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '200px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.4*', minWidth: '120px' },
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
        icon={<Scissors size={22} />}
        title={isAr ? 'الخدمات' : isEn ? 'Services' : 'Soins'}
        primaryAction={{
          label: isAr ? 'خدمة جديدة' : isEn ? 'New Service' : 'Nouvelle Prestation',
          icon: <Plus size={15} strokeWidth={2.5} />,
          onClick: handleOpenCreateModal,
        }}
      />

      <ScreenKpiBanner
        heading={isAr ? 'مؤشرات التسعير والربحية' : isEn ? 'Service Catalog & Pricing' : 'Rentabilité & Grille Tarifaire'}
        language={language}
        primaryCard={{
          label: isAr ? 'خدمات تصفيف الشعر' : isEn ? 'Hair & Styling' : 'Coiffure & Coupe',
          badgeText: `↗ ${catalogMetrics.avgDuration} min moy.`,
          count: catalogMetrics.hairCount,
          tone: 'emerald',
          isActive: tierFilter === 'Hair',
          onToggle: () => setTierFilter((p) => (p === 'Hair' ? 'All' : 'Hair')),
        }}
        secondaryCard={{
          label: isAr ? 'عناية فاخرة وسبا' : isEn ? 'Signature & Spa' : 'Soins Signature & Spa',
          badgeText: `${catalogMetrics.totalServices} total`,
          count: catalogMetrics.premiumCount,
          tone: 'terracotta',
          isActive: tierFilter === 'Premium',
          onToggle: () => setTierFilter((p) => (p === 'Premium' ? 'All' : 'Premium')),
        }}
        darkCard={{
          label: isAr ? 'متوسط التعريفة' : isEn ? 'Average Service Tariff' : 'Tarif Moyen au Barème',
          badgePrefix: '~',
          badgeCount: catalogMetrics.avgGrossMargin,
          badgeSuffix: '% marge',
          valuePrefix: '',
          valueCount: catalogMetrics.avgPrice,
          formatValue: (n) => formatMoney(n),
          caption: `${currentBranch?.name || 'Salon Principal'} · ${isAr ? 'التسعيرة الرسمية' : 'Grille Certifiée'}`,
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'كتالوج الخدمات والأسعار' : isEn ? 'Services Catalog' : 'Prestations & Forfaits'}
          liveRegionText={`${sortedServices.length} prestations`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr ? 'بحث عن خدمة أو فرع...' : isEn ? 'Search service, category, branch...' : 'Rechercher soin, catégorie, branche...'
          }
          statusOptions={statusOptions}
          statusValue={tierFilter}
          onStatusChange={(v) => setTierFilter(v as any)}
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

        <UniversalDataCollection<ServiceItem>
          items={sortedServices}
          columns={columns}
          getRowMeta={getRowMeta}
          getFanActions={getFanActions}
          getDetailActions={getDetailActions}
          keyExtractor={(s) => s.id}
          viewMode={viewMode}
          hideToolbar
          openItemId={inspectingService?.id ?? null}
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
          selectedIds={selectedServiceIds}
          onSelectionChange={setSelectedServiceIds}
          pinnedIds={pinnedServiceIds}
          onPinToggle={(s: any) => {
            const id = typeof s === 'string' ? s : s.id;
            setPinnedServiceIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onItemClick={(service, opener) => {
            setDrawerOpenerEl(opener || null);
            setInspectingService(service);
          }}
          onViewDetails={(service, opener) => {
            setDrawerOpenerEl(opener || null);
            setInspectingService(service);
          }}
          onEdit={(service) => handleOpenEditModal(service)}
          onDelete={(service) => {
            deleteServiceItem(service.id);
            if (inspectingService?.id === service.id) setInspectingService(null);
          }}
          onBulkDelete={handleBatchDelete}
          emptyTitle={isAr ? 'لا توجد خدمات' : 'Aucune prestation trouvée'}
          emptyDescription={isAr ? 'أضف خدمات جديدة للكتالوج' : 'Ajoutez de nouvelles prestations au catalogue.'}
          primaryActionLabel="Nouvelle Prestation"
          onAddFirstItem={handleOpenCreateModal}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveAdvancedFilters || tierFilter !== 'All' || searchQuery.trim().length > 0}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedServices.length}
        entityPluralLabel={isAr ? 'خدمات' : 'prestations'}
        hasActiveFilters={hasActiveAdvancedFilters}
        onResetFilters={handleResetFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector<ServiceItem>
        isOpen={inspectingService !== null}
        item={inspectingService}
        allItems={sortedServices}
        keyExtractor={(s) => s.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={inspectingService?.name || ''}
        subtitle={inspectingService ? `${CATEGORY_LABELS[inspectingService.category] || inspectingService.category} · ${inspectingService.durationMinutes} min` : undefined}
        avatarText={inspectingService ? inspectingService.name.slice(0, 2).toUpperCase() : undefined}
        categoryLabel={inspectingService ? (CATEGORY_LABELS[inspectingService.category] || inspectingService.category) : undefined}
        branchName={
          inspectingService
            ? resolveRecordBranch(inspectingService, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={`${inspectingService?.commissionRate || 40}% comm.`}
        statusClassName="bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]"
        tabs={[
          { id: 'overview', label: isAr ? 'التسعيرة' : isEn ? 'Pricing' : 'Tarif & Cabine' },
          { id: 'economics', label: isAr ? 'الربحية' : isEn ? 'Margins' : 'Marges & Coûts' },
          { id: 'protocol', label: isAr ? 'البروتوكول' : isEn ? 'Protocol' : 'Protocole Soin' },
        ]}
        onClose={() => setInspectingService(null)}
        onSelectItem={(s) => setInspectingService(s)}
        holdToDelete
        deleteLabel={isAr ? 'حذف' : 'Supprimer'}
        onDelete={(s) => {
          deleteServiceItem(s.id);
          setInspectingService(null);
        }}
        renderBody={(service, activeTab) => {
          const branchName = resolveRecordBranch(service, branchesById, currentBranch, language).name;
          const cost = service.costPrice || 0;
          const marginPct = service.price > 0 ? Math.round(((service.price - cost) / service.price) * 100) : 100;

          if (activeTab === 'economics') {
            return (
              <>
                <InspectorSection index={0} title="Rentabilité nette">
                  <InspectorBigStat value={formatMoney(service.price)} tone="accent" />
                </InspectorSection>
                <InspectorSection index={1} title="Décomposition financière">
                  <InspectorCard>
                    <InspectorKeyValue label="Coût consommables" value={formatMoney(cost)} />
                    <InspectorKeyValue label="Marge brute" value={`${marginPct}%`} tone="ok" />
                    <InspectorKeyValue label="Part styliste" value={`${service.commissionRate || 40}%`} tone="accent" isLast />
                    <InspectorProgressBar percent={marginPct} tone="ok" />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }

          if (activeTab === 'protocol') {
            return (
              <>
                <InspectorSection index={0} title="Paramètres cabine">
                  <InspectorCard>
                    <InspectorKeyValue label="Durée active" icon={<Clock className="w-[15px] h-[15px]" />} value={`${service.durationMinutes} min`} />
                    <InspectorKeyValue label="Temps tampon" value={`${service.bufferMinutes || 0} min`} />
                    <InspectorKeyValue label="Branche" icon={<Building2 className="w-[15px] h-[15px]" />} value={branchName} mono={false} isLast />
                  </InspectorCard>
                </InspectorSection>
                {service.description && (
                  <InspectorSection index={1} title="Description technique">
                    <InspectorCard className="py-4 t-body text-black/75 dark:text-white/80">
                      <p className="py-1 leading-relaxed">{service.description}</p>
                    </InspectorCard>
                  </InspectorSection>
                )}
              </>
            );
          }

          return (
            <>
              <InspectorSection index={0} title="Actions rapides">
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'edit',
                      label: 'Modifier tarif',
                      icon: <Edit2 className="w-[18px] h-[18px]" />,
                      primary: true,
                      onClick: () => {
                        setInspectingService(null);
                        handleOpenEditModal(service);
                      },
                    },
                    {
                      id: 'copy',
                      label: 'Copier barème',
                      icon: <Copy className="w-[18px] h-[18px]" />,
                      onClick: () => {
                        const txt = `${service.name} · ${formatMoney(service.price)} (${service.durationMinutes} min)`;
                        navigator.clipboard?.writeText(txt);
                        showToast?.({ type: 'success', title: 'Copié', message: txt });
                      },
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title="Grille & Commission">
                <InspectorCard>
                  <InspectorKeyValue label="Tarif Client" value={formatMoney(service.price)} tone="accent" />
                  <InspectorKeyValue label="Durée cabine" value={`${service.durationMinutes} min`} />
                  <InspectorKeyValue label="Commission" value={`${service.commissionRate || 40}%`} tone="ok" />
                  <InspectorKeyValue label="Coût matière" value={formatMoney(cost)} isLast />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection index={2}>
                <InspectorWideButton
                  label="Modifier le Tarif / Protocole"
                  icon={<Edit2 className="w-4 h-4" />}
                  tone="dark"
                  onClick={() => {
                    setInspectingService(null);
                    handleOpenEditModal(service);
                  }}
                />
              </InspectorSection>
            </>
          );
        }}
      />

      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-[#1F1D1B]/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="sq-elev-pop max-w-lg w-full">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-[#1C1B1A] w-full p-6 border border-[#E6DED6] dark:border-[#3A3734] [--sq-stroke:#E6DED6] dark:[--sq-stroke:#3A3734] space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E6DED6] dark:border-[#3A3734]">
                <h3 className="t-card font-semibold text-black dark:text-white">
                  {editingService ? 'Modifier la Prestation' : 'Nouvelle Prestation'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="p-2 rounded-full text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSaveService} className="space-y-4">
                <LabelInput
                  field="Name"
                  label="Intitulé du Soin"
                  required
                  value={formName}
                  onChange={setFormName}
                  placeholder="Ex: Balayage Californien & Gloss..."
                  width="100%"
                  height={42}
                  corner={12}
                />
              <div className="grid grid-cols-2 gap-3">
                <LabelSelect
                  field="Category"
                  label="Catégorie"
                  value={formCategory}
                  onChange={(val) =>
                    setFormCategory(typeof val === 'string' ? (val as any) : val.target?.value || val)
                  }
                  options={[
                    { value: 'Hair', label: 'Coiffure & Lissage' },
                    { value: 'Nails', label: 'Onglerie Russe' },
                    { value: 'Facial', label: 'Soins Visage' },
                    { value: 'Bridal', label: 'Haute Mariée' },
                    { value: 'Massage', label: 'Massages & Corps' },
                    { value: 'Barber', label: 'Barbier' },
                  ]}
                  height={42}
                  corner={12}
                />
                <LabelInput
                  field="Duration"
                  label="Durée cabine (minutes)"
                  type="number"
                  required
                  value={String(formDuration)}
                  onChange={(v) => setFormDuration(parseInt(v, 10) || 30)}
                  width="100%"
                  height={42}
                  corner={12}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  field="Price"
                  label="Tarif Client (DZD)"
                  type="number"
                  required
                  value={String(formPrice)}
                  onChange={(v) => setFormPrice(parseFloat(v) || 0)}
                  width="100%"
                  height={42}
                  corner={12}
                />
                <LabelInput
                  field="Commission"
                  label="Commission Styliste (%)"
                  type="number"
                  value={String(formCommission)}
                  onChange={(v) => setFormCommission(parseFloat(v) || 0)}
                  width="100%"
                  height={42}
                  corner={12}
                />
              </div>
              <LabelInput
                field="Description"
                label="Description & Protocole"
                value={formDescription}
                onChange={setFormDescription}
                placeholder="Précisions techniques..."
                width="100%"
                height={42}
                corner={12}
              />
              <div className="flex items-center justify-end gap-3 pt-3">
                <AtriumButton type="button" variant="ghost" onClick={() => setIsServiceModalOpen(false)}>
                  Annuler
                </AtriumButton>
                <AtriumButton type="submit" variant="primary">
                  Enregistrer
                </AtriumButton>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

AppointmentServicesView.displayName = 'AppointmentServicesView';
