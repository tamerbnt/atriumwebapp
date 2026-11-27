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
  selectCurrentProductsFromState,
  showToast,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { ServiceConsumableItem, ServiceItem } from '../../../types/index';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { SalonPackagesConsentPanel } from './SalonPackagesConsentPanel';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Button } from '@/atrium/core';
import { formatMoney } from '../../../utils/rules';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticModalShell,
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
    account,
    servicesCatalog,
    products,
    branches,
    currentBranch,
    language,
    isSyncing,
    networkMode,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumSelector(
    (s) => ({
      account: s.account,
      servicesCatalog: selectCurrentServicesFromState(s),
      products: selectCurrentProductsFromState(s),
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

  const [serviceTab, setServiceTab] = useState<'catalog' | 'packages' | 'consent'>('catalog');
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
  const [formDuration, setFormDuration] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formCommission, setFormCommission] = useState('');
  const [formBuffer, setFormBuffer] = useState('');
  const [formColor, setFormColor] = useState('#d4522f');
  const [formDescription, setFormDescription] = useState('');
  const [formAllergyKeywords, setFormAllergyKeywords] = useState('');
  const [formRequiresConsent, setFormRequiresConsent] = useState(false);
  const [formConsumables, setFormConsumables] = useState<ServiceConsumableItem[]>([]);
  const [consumableProductId, setConsumableProductId] = useState('');
  const [consumableQty, setConsumableQty] = useState('1');

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
    setFormDuration('');
    setFormPrice('');
    setFormCostPrice('');
    setFormCommission('');
    setFormBuffer('');
    setFormColor('#d4522f');
    setFormDescription('');
    setFormAllergyKeywords('');
    setFormRequiresConsent(false);
    setFormConsumables([]);
    setConsumableProductId(products[0]?.id || '');
    setConsumableQty('1');
    setIsServiceModalOpen(true);
  }, [products]);

  const handleOpenEditModal = useCallback((service: ServiceItem) => {
    setEditingService(service);
    setFormName(service.name);
    setFormCategory(service.category);
    setFormDuration(String(service.durationMinutes));
    setFormPrice(String(service.price));
    setFormCostPrice(String(service.costPrice ?? ''));
    setFormCommission(String(service.commissionRate ?? ''));
    setFormBuffer(String(service.bufferMinutes ?? ''));
    setFormColor(service.color || '#d4522f');
    setFormDescription(service.description || '');
    setFormAllergyKeywords((service.allergyKeywords || []).join(', '));
    setFormRequiresConsent(Boolean(service.requiresConsent));
    setFormConsumables(service.consumables || []);
    setConsumableProductId(products[0]?.id || '');
    setConsumableQty('1');
    setIsServiceModalOpen(true);
  }, [products]);

  const handleAddConsumable = useCallback(() => {
    const prod = products.find((p) => p.id === consumableProductId);
    const qty = Math.max(0.1, parseFloat(consumableQty) || 1);
    if (!prod) return;
    setFormConsumables((prev) => {
      const existing = prev.find((c) => c.productId === prod.id);
      if (existing) {
        return prev.map((c) => (c.productId === prod.id ? { ...c, quantity: c.quantity + qty } : c));
      }
      return [...prev, { productId: prod.id, productName: prod.name, quantity: qty, unit: 'unit' }];
    });
  }, [products, consumableProductId, consumableQty]);

  const handleSaveService = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!formName.trim()) {
        showToast?.({ type: 'error', title: 'Nom requis', message: 'Saisissez le nom du soin.' });
        return;
      }
      const parsedDuration = parseInt(formDuration, 10);
      const parsedPrice = parseFloat(formPrice);
      if (!Number.isFinite(parsedDuration) || parsedDuration <= 0 || !Number.isFinite(parsedPrice) || parsedPrice < 0) {
        showToast?.({ type: 'error', title: 'Saisie invalide', message: 'Saisissez une durée et un tarif valides.' });
        return;
      }
      const parsedCost = formCostPrice.trim() ? parseFloat(formCostPrice) || 0 : 0;
      const parsedComm = formCommission.trim() ? parseFloat(formCommission) || 0 : 0;
      const parsedBuf = formBuffer.trim() ? parseInt(formBuffer, 10) || 0 : 0;
      const allergyKeywords = formAllergyKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      if (editingService) {
        updateServiceItem(editingService.id, {
          name: formName.trim(),
          category: formCategory,
          durationMinutes: parsedDuration,
          price: parsedPrice,
          costPrice: parsedCost,
          commissionRate: parsedComm,
          bufferMinutes: parsedBuf,
          color: formColor,
          description: formDescription.trim(),
          allergyKeywords,
          requiresConsent: formRequiresConsent,
          consumables: formConsumables,
        });
      } else {
        const activeAccountId = (currentBranch?.accountId || account?.id || '').trim();
        const activeBranchId = (currentBranch?.id || '').trim();
        if (!activeAccountId || !activeBranchId) {
          showToast?.({
            type: 'error',
            title: t('tenant_context_missing_title', language),
            message: t('tenant_context_missing_msg', language),
          });
          return;
        }
        addServiceItem({
          tenantId: activeAccountId,
          name: formName.trim(),
          category: formCategory,
          durationMinutes: parsedDuration,
          price: parsedPrice,
          costPrice: parsedCost,
          commissionRate: parsedComm,
          bufferMinutes: parsedBuf,
          color: formColor,
          colorCode: formColor,
          description: formDescription.trim(),
          allergyKeywords,
          requiresConsent: formRequiresConsent,
          consumables: formConsumables,
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
      formAllergyKeywords,
      formRequiresConsent,
      formConsumables,
      account,
      currentBranch,
      language,
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
              {isEn ? 'Cost:' : 'Coût:'} {formatMoney(service.costPrice || 0)}
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
        metricSecondary: `${margin}% ${isEn ? 'margin' : 'marge'}`,
        detailCol1: {
          heading: isAr ? 'التصنيف والمدة' : isEn ? 'Protocol & Duration' : 'Protocole & Durée',
          primaryText: `${service.durationMinutes} min`,
          secondaryText: service.bufferMinutes
            ? `+${service.bufferMinutes} min ${isEn ? 'buffer' : 'tampon'}`
            : isEn ? 'No buffer' : 'Sans tampon',
          tertiaryText: branch.name,
        },
        detailCol2: {
          heading: isAr ? 'التكلفة والهامش' : isEn ? 'Profitability' : 'Rentabilité',
          primaryText: `${margin}% ${isEn ? 'gross margin' : 'marge brute'}`,
          secondaryText: `${isEn ? 'Cost:' : 'Coût:'} ${formatMoney(service.costPrice || 0)}`,
        },
        detailCol3: {
          heading: isAr ? 'العمولة' : 'Commission',
          primaryText: `${service.commissionRate || 40}% ${isEn ? 'stylist' : 'styliste'}`,
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
        secondaryActions={
          <LiveSegmentedControl
            size="sm"
            value={serviceTab}
            onValueChange={(v) => setServiceTab(v as 'catalog' | 'packages' | 'consent')}
            aria-label={isEn ? 'Services View Mode' : 'Onglet Soins'}
            options={[
              { value: 'catalog', label: isAr ? 'الكتالوج' : isEn ? 'Services Catalog' : 'Catalogue Soins' },
              { value: 'packages', label: isAr ? 'الباقات والهدايا' : isEn ? 'Packages & Gift Cards' : 'Forfaits & Cartes Cadeaux' },
              { value: 'consent', label: isAr ? 'الموافقة الطبية' : isEn ? 'Tattoo & Laser Consent' : 'Consentement & Photos' },
            ]}
          />
        }
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
          badgeText: `↗ ${catalogMetrics.avgDuration} ${isEn ? 'min avg' : 'min moy.'}`,
          count: catalogMetrics.hairCount,
          tone: 'emerald',
          isActive: tierFilter === 'Hair',
          onToggle: () => setTierFilter((p) => (p === 'Hair' ? 'All' : 'Hair')),
        }}
        secondaryCard={{
          label: isAr ? 'عناية فاخرة وسبا' : isEn ? 'Signature & Spa' : 'Soins Signature & Spa',
          badgeText: isAr ? 'فاخرة' : isEn ? 'signature' : 'signature',
          count: catalogMetrics.premiumCount,
          tone: 'terracotta',
          isActive: tierFilter === 'Premium',
          onToggle: () => setTierFilter((p) => (p === 'Premium' ? 'All' : 'Premium')),
        }}
        darkCard={{
          label: isAr ? 'متوسط التعريفة' : isEn ? 'Average Service Tariff' : 'Tarif Moyen au Barème',
          badgePrefix: '~',
          badgeCount: catalogMetrics.avgGrossMargin,
          badgeSuffix: isAr ? '% هامش' : isEn ? '% margin' : '% marge',
          valuePrefix: '',
          valueCount: catalogMetrics.avgPrice,
          formatValue: (n) => formatMoney(n),
          caption: `${currentBranch?.name || 'Salon Principal'} · ${isAr ? 'التسعيرة الرسمية' : isEn ? 'Certified Tariff' : 'Grille Certifiée'}`,
        }}
      />

      {serviceTab === 'packages' ? (
        <SalonPackagesConsentPanel mode="packages" />
      ) : serviceTab === 'consent' ? (
        <SalonPackagesConsentPanel mode="consent" />
      ) : (
      <>
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
      </>
      )}

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
        statusClassName="bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]"
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
                    <InspectorKeyValue
                      label={isAr ? 'يتطلب موافقة' : isEn ? 'Consent Required' : 'Consentement requis'}
                      value={service.requiresConsent ? (isEn ? 'Yes' : 'Oui') : (isEn ? 'No' : 'Non')}
                      tone={service.requiresConsent ? 'warn' : undefined}
                    />
                    <InspectorKeyValue label="Branche" icon={<Building2 className="w-[15px] h-[15px]" />} value={branchName} mono={false} isLast />
                  </InspectorCard>
                </InspectorSection>
                {Array.isArray(service.consumables) && service.consumables.length > 0 && (
                  <InspectorSection index={1} title={isAr ? 'المواد المستهلكة' : isEn ? 'Consumables Linked' : 'Consommables liés'}>
                    <InspectorCard>
                      {service.consumables.map((c, idx) => (
                        <InspectorKeyValue
                          key={c.productId}
                          label={c.productName}
                          value={`-${c.quantity}`}
                          isLast={idx === service.consumables!.length - 1}
                        />
                      ))}
                    </InspectorCard>
                  </InspectorSection>
                )}
                {Array.isArray(service.allergyKeywords) && service.allergyKeywords.length > 0 && (
                  <InspectorSection index={2} title={isAr ? 'مسببات الحساسية' : isEn ? 'Allergy Keywords' : 'Mots-clés allergènes'}>
                    <InspectorCard className="py-3 t-small text-amber-700 dark:text-amber-300">
                      {service.allergyKeywords.join(', ')}
                    </InspectorCard>
                  </InspectorSection>
                )}
                {service.description && (
                  <InspectorSection index={3} title="Description technique">
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

      <KineticModalShell
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        maxWidthClass="max-w-lg"
        zIndexClass="z-50"
        scrimClassName="bg-[#1F1D1B]/45"
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] w-full p-6 border-0 [--sq-stroke:var(--sq-stroke-pop)] space-y-4 max-h-[92vh] overflow-y-auto"
        >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
                <h3 className="t-card font-semibold text-black dark:text-white">
                  {editingService ? 'Modifier la Prestation' : 'Nouvelle Prestation'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  aria-label={isAr ? 'إغلاق' : isEn ? 'Close' : 'Fermer'}
                  className="p-2 rounded-full text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
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
                  height={40}
                  corner={12}
                />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelSelect
                  field="Category"
                  width="100%"
                  label="Catégorie"
                  value={formCategory}
                  onChange={(val) => {
                    const nextCat = val as ServiceItem['category'];
                    setFormCategory(nextCat);
                    if (nextCat === 'Tattoo' || nextCat === 'Laser') {
                      setFormRequiresConsent(true);
                    }
                  }}
                  options={[
                    { value: 'Hair', label: 'Coiffure & Lissage' },
                    { value: 'Nails', label: 'Onglerie Russe' },
                    { value: 'Facial', label: 'Soins Visage' },
                    { value: 'Bridal', label: 'Haute Mariée' },
                    { value: 'Massage', label: 'Massages & Corps' },
                    { value: 'Barber', label: 'Barbier' },
                    { value: 'Hammam', label: 'Hammam & Spa' },
                    { value: 'Laser', label: 'Épilation Laser' },
                    { value: 'Tattoo', label: 'Tatouage / Dermopigmentation' },
                  ]}
                  height={40}
                  corner={12}
                />
                <LabelInput
                  field="Duration"
                  label="Durée cabine (minutes)"
                  type="number"
                  placeholder="60"
                  required
                  value={formDuration}
                  onChange={setFormDuration}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="Price"
                  label="Tarif Client (DZD)"
                  type="number"
                  placeholder="5000"
                  required
                  value={formPrice}
                  onChange={setFormPrice}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  field="Commission"
                  label="Commission Styliste (%)"
                  type="number"
                  placeholder="40"
                  value={formCommission}
                  onChange={setFormCommission}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="CostPrice"
                  label={isAr ? 'تكلفة المواد (دج)' : isEn ? 'Consumables Cost (DZD)' : 'Coût matière (DZD)'}
                  type="number"
                  placeholder="800"
                  value={formCostPrice}
                  onChange={setFormCostPrice}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  field="BufferMinutes"
                  label={isAr ? 'وقت التجهيز (دقائق)' : isEn ? 'Buffer Time (min)' : 'Temps tampon (min)'}
                  type="number"
                  placeholder="10"
                  value={formBuffer}
                  onChange={setFormBuffer}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
              <LabelInput
                field="AllergyKeywords"
                label={isAr ? 'كلمات التحسس (مفصولة بفاصلة)' : isEn ? 'Allergy Keywords (comma-separated)' : 'Allergènes (séparés par virgule)'}
                value={formAllergyKeywords}
                onChange={setFormAllergyKeywords}
                placeholder="ammonia, peroxide, latex..."
                width="100%"
                height={40}
                corner={12}
              />
              <label className="flex items-center gap-2.5 t-small font-medium text-black dark:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={formRequiresConsent}
                  onChange={(e) => setFormRequiresConsent(e.target.checked)}
                  className="rounded border-black/30"
                />
                {isAr ? 'يتطلب نموذج موافقة موقع (ليزر/تاتو)' : isEn ? 'Requires signed consent form (Tattoo / Laser)' : 'Consentement médical signé requis (Tatouage / Laser)'}
              </label>

              {products.length > 0 && (
                <div className="p-3 rounded-xl bg-[#FAF7F4] dark:bg-[#1E1C1A] border border-[var(--atr-divider)] space-y-2">
                  <p className="t-small font-semibold text-black dark:text-white">
                    {isAr ? 'ربط المواد المستهلكة من المخزون' : isEn ? 'Consumables Stock Mapping' : 'Consommables déduits du stock'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_90px_auto] gap-2 items-end">
                    <LabelSelect
                      field="ConsumableProduct"
                      label={isAr ? 'المنتج' : isEn ? 'Stock Product' : 'Produit stock'}
                      value={consumableProductId}
                      onChange={setConsumableProductId}
                      options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.stockQuantity})` }))}
                      width="100%"
                      height={36}
                      corner={10}
                    />
                    <LabelInput
                      field="ConsumableQty"
                      label={isAr ? 'الكمية' : isEn ? 'Qty' : 'Qté'}
                      type="number"
                      value={consumableQty}
                      onChange={setConsumableQty}
                      width="100%"
                      height={36}
                      corner={10}
                    />
                    <Button type="button" tone="soft" size={36} onClick={handleAddConsumable}>
                      <Plus size={14} />
                    </Button>
                  </div>
                  {formConsumables.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {formConsumables.map((c) => (
                        <span
                          key={c.productId}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#2B2825] border border-[var(--atr-divider)] t-cap font-semibold"
                        >
                          {c.productName} × {c.quantity}
                          <button
                            type="button"
                            onClick={() => setFormConsumables((prev) => prev.filter((item) => item.productId !== c.productId))}
                            className="text-rose-600 hover:text-rose-700 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <LabelInput
                field="Description"
                label="Description & Protocole"
                value={formDescription}
                onChange={setFormDescription}
                placeholder="Précisions techniques..."
                width="100%"
                height={40}
                corner={12}
              />
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
                <Button type="button" tone="soft" size={40} onClick={() => setIsServiceModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" tone="accent" size={40}>
                  Enregistrer
                </Button>
              </div>
              </form>
            </div>
      </KineticModalShell>
    </div>
  );
});

AppointmentServicesView.displayName = 'AppointmentServicesView';
