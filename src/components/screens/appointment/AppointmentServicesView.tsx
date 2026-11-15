import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Scissors,
  Clock,
  Plus,
  Edit2,
  Trash2,
  X,
  Building2,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentServicesFromState,
  selectCurrentBranchFromState,
} from '../../../services/store';
import { ServiceItem } from '../../../types/index';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { formatMoney } from '../../../utils/rules';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
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
    showToast,
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
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(null);

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
    const hairCount = list.filter((s) => s.category === 'Hair' || s.category === 'Color' || s.category === 'Barber').length;
    const premiumCount = list.filter((s) => s.price >= 4500 || s.category === 'Bridal' || s.category === 'Spa').length;
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
      if (tierFilter === 'Hair' && s.category !== 'Hair' && s.category !== 'Color' && s.category !== 'Barber') {
        return false;
      }
      if (tierFilter === 'Premium' && s.price < 4500 && s.category !== 'Bridal' && s.category !== 'Spa') {
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
        showToast?.({ type: 'success', title: 'Prestation mise à jour', message: formName });
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
        showToast?.({ type: 'success', title: 'Prestation ajoutée', message: formName });
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
      showToast,
    ]
  );

  const handleBatchDelete = useCallback(() => {
    const count = selectedServiceIds.size;
    batchDeleteServiceItems(Array.from(selectedServiceIds));
    setSelectedServiceIds(new Set());
    showToast?.({ type: 'info', title: 'Suppression en masse', message: `${count} prestations supprimées.` });
  }, [selectedServiceIds, batchDeleteServiceItems, showToast]);

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
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: service.color || '#d4522f' }}
            />
            <div className="min-w-0">
              <span className="text-[13.5px] font-semibold text-black dark:text-white truncate block">
                {service.name}
              </span>
              <span className="text-[11px] text-black/62 dark:text-white/65 truncate block">
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
          <div className="text-[12.5px] tabular-nums">
            <span className="font-semibold text-black dark:text-white block">
              {service.durationMinutes} min
              {service.bufferMinutes ? ` (+${service.bufferMinutes}m)` : ''}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">
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
            <span className="text-[13px] font-bold font-mono text-[#d4522f] block">
              {formatMoney(service.price)}
            </span>
            <span className="text-[11px] text-black/62 dark:text-white/65 font-mono block">
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
          <span className="text-[12.5px] font-medium text-black/80 dark:text-white/85 truncate block">
            {resolveRecordBranch(service, branchesById, currentBranch, language).name}
          </span>
        ),
      },
    ],
    [isAr, isEn, branchesById, currentBranch, language]
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
          data={sortedServices}
          columns={columns}
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
          onDelete={(service) => setServiceToDelete(service)}
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
        avatarText={inspectingService ? inspectingService.name.charAt(0).toUpperCase() : undefined}
        branchName={
          inspectingService
            ? resolveRecordBranch(inspectingService, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={`${inspectingService?.commissionRate || 40}% comm.`}
        statusClassName="bg-emerald-50 text-emerald-700 border border-emerald-200"
        onClose={() => setInspectingService(null)}
        onSelectItem={(s) => setInspectingService(s)}
        onEdit={(s) => {
          setInspectingService(null);
          handleOpenEditModal(s);
        }}
        holdToDelete={{
          label: isAr ? 'حذف' : 'Supprimer',
          onDelete: (s) => {
            deleteServiceItem(s.id);
            setInspectingService(null);
          },
        }}
        renderBody={(service) => (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#F3EDE7] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] flex justify-between items-center">
              <div>
                <span className="text-[11px] font-semibold uppercase text-[#d4522f] block">Tarif Client</span>
                <span className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans tabular-nums text-black dark:text-white">
                  {formatMoney(service.price)}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1C1B1A] border border-[#E6DED6] dark:border-[#3A3734] font-semibold">
                {service.durationMinutes} min
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#FBF8F5] dark:bg-[#262422] border border-[#E6DED6] dark:border-[#3A3734] space-y-2.5">
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">Coût consommables:</span>
                <span className="font-mono font-semibold">{formatMoney(service.costPrice || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">Temps tampon:</span>
                <span className="font-mono font-semibold">{service.bufferMinutes || 0} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black/62 dark:text-white/65">Branche:</span>
                <span className="font-semibold flex items-center gap-1">
                  <Building2 size={12} className="text-[#d4522f]" />
                  {resolveRecordBranch(service, branchesById, currentBranch, language).name}
                </span>
              </div>
              {service.description && (
                <p className="pt-2 border-t border-[#E6DED6] dark:border-[#3A3734] text-black/75 dark:text-white/80">
                  {service.description}
                </p>
              )}
            </div>
            <AtriumButton
              type="button"
              variant="primary"
              icon={<Edit2 size={14} />}
              className="w-full justify-center"
              onClick={() => {
                setInspectingService(null);
                handleOpenEditModal(service);
              }}
            >
              Modifier le Tarif / Protocole
            </AtriumButton>
          </div>
        )}
      />

      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-[#1F1D1B]/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1C1B1A] rounded-[24px] max-w-lg w-full p-6 shadow-2xl border border-[#E6DED6] dark:border-[#3A3734] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6DED6] dark:border-[#3A3734]">
              <h3 className="text-base font-bold text-black dark:text-white">
                {editingService ? 'Modifier la Prestation' : 'Nouvelle Prestation'}
              </h3>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white cursor-pointer"
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
                corner={10}
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
                  corner={10}
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
                  corner={10}
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
                  corner={10}
                />
                <LabelInput
                  field="Commission"
                  label="Commission Styliste (%)"
                  type="number"
                  value={String(formCommission)}
                  onChange={(v) => setFormCommission(parseFloat(v) || 0)}
                  width="100%"
                  height={42}
                  corner={10}
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
                corner={10}
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
      )}

      <ConfirmDialog
        isOpen={Boolean(serviceToDelete)}
        onClose={() => setServiceToDelete(null)}
        onConfirm={() => {
          if (serviceToDelete) {
            deleteServiceItem(serviceToDelete.id);
            showToast?.({ type: 'info', title: 'Prestation retirée', message: serviceToDelete.name });
            setServiceToDelete(null);
          }
        }}
        title="Supprimer la prestation"
        description={`Supprimer définitivement "${serviceToDelete?.name}" du catalogue ?`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />
    </div>
  );
});

AppointmentServicesView.displayName = 'AppointmentServicesView';
