import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Boxes,
  Plus,
  Package,
  MapPin,
  Edit,
  Pin,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  selectCurrentBusinessFromState,
  showToast,
} from '../../../services/store';
import { t } from '../../../utils/i18n';
import { pickLocalizedText, runUndoBatch } from '../../../services/undoEngine';
import { formatMoney } from '../../../utils/rules';
import { resolveBatchSelection } from '../../../utils/step5Actions';
import { useGarageData, SparePart } from './garageData';
import { AutoGaragePurchasingPanel } from './AutoGaragePurchasingPanel';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { AtriumButton } from '../../ui/AtriumButton';
import { Button } from '@/atrium/core';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
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
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorProgressBar,
  InspectorBigStat,
  InspectorListItem,
  InspectorNotesField,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  KineticModalShell,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const PART_CATEGORIES = [
  'Freinage',
  'Filtration',
  'Suspension',
  'Moteur',
  'Électrique',
  'Huiles & Fluides',
];

export const AutoGaragePartsView: React.FC<any> = () => {
  const {
    account,
    language,
    currentBusiness,
    currentBranch,
    currentUser,
    branches,
    isSyncing,
    networkMode,
    isSyncTimeout,
  } = useAtriumSelector(
    (s) => ({
      account: s.account,
      language: s.language,
      currentBusiness: selectCurrentBusinessFromState(s),
      currentBranch: selectCurrentBranchFromState(s),
      currentUser: s.currentUser,
      branches: s.branches,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode,
      isSyncTimeout: s.isSyncTimeout,
    }),
    shallowEqualObjects
  );
  const { retryCloudSync } = useAtriumActions();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const {
    parts,
    suppliers,
    purchaseOrders,
    addPart,
    updatePart,
    deletePart,
    createPurchaseOrder,
    receivePurchaseOrderWithBl,
  } = useGarageData();

  const [activePartsTab, setActivePartsTab] = useState<'catalog' | 'purchasing' | 'warranties'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'calendar'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set<string>(['part_01']));
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partToEdit, setPartToEdit] = useState<SparePart | null>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Freinage');
  const [stockQuantity, setStockQuantity] = useState('');
  const [minThreshold, setMinThreshold] = useState('');
  const [buyingPriceDzd, setBuyingPriceDzd] = useState('');
  const [sellingPriceDzd, setSellingPriceDzd] = useState('');
  const [locationBin, setLocationBin] = useState('');
  const [compatibility, setCompatibility] = useState('');

  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState(suppliers[0]?.id || '');
  const [poPartId, setPoPartId] = useState(parts[0]?.id || '');
  const [poQuantity, setPoQuantity] = useState('');
  const [poUnitCost, setPoUnitCost] = useState('');
  const [poBlNumber, setPoBlNumber] = useState('');

  const [inspectedPart, setInspectedPart] = useState<SparePart | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('fiche');
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [bulkRestockParts, setBulkRestockParts] = useState<SparePart[] | null>(null);
  const [bulkRestockQty, setBulkRestockQty] = useState<string>('5');

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activePart = useMemo(() => {
    if (!inspectedPart) return null;
    return parts.find((p) => p.id === inspectedPart.id) || inspectedPart;
  }, [inspectedPart, parts]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    parts.forEach((p) => {
      const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [parts, branchesById, currentBranch, language]);

  const lowStockCount = useMemo(
    () => parts.filter((p) => p.stockQuantity <= p.minThreshold).length,
    [parts]
  );
  const normalStockCount = parts.length - lowStockCount;
  const totalStockUnits = useMemo(
    () => parts.reduce((acc, p) => acc + p.stockQuantity, 0),
    [parts]
  );
  const totalValuation = useMemo(
    () => parts.reduce((acc, p) => acc + p.stockQuantity * p.sellingPriceDzd, 0),
    [parts]
  );

  const filteredParts = useMemo(() => {
    return parts.filter((p) => {
      if (categoryFilter === 'LowStock') {
        if (p.stockQuantity > p.minThreshold) return false;
      } else if (categoryFilter === 'Healthy') {
        if (p.stockQuantity <= p.minThreshold) return false;
      } else if (categoryFilter !== 'All' && p.category !== categoryFilter) {
        return false;
      }
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(p, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesCat = p.category.toLowerCase().includes(q);
        const matchesLoc = p.locationBin.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesCat && !matchesLoc) return false;
      }
      return true;
    });
  }, [parts, categoryFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedParts = useMemo(() => {
    const list = [...filteredParts];
    list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      let cmp = 0;
      if (sortBy === 'sku') {
        cmp = a.sku.localeCompare(b.sku);
      } else if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'branch') {
        const ba = resolveRecordBranch(a, branchesById, currentBranch, language).name;
        const bb = resolveRecordBranch(b, branchesById, currentBranch, language).name;
        cmp = ba.localeCompare(bb);
      } else if (sortBy === 'stockQuantity') {
        cmp = a.stockQuantity - b.stockQuantity;
      } else if (sortBy === 'sellingPrice') {
        cmp = a.sellingPriceDzd - b.sellingPriceDzd;
      } else if (sortBy === 'locationBin') {
        cmp = a.locationBin.localeCompare(b.locationBin);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredParts, pinnedIds, sortBy, sortDir, branchesById, currentBranch, language]);

  const openCreateModal = useCallback(() => {
    setPartToEdit(null);
    setName('');
    setSku('');
    setCategory('Freinage');
    setStockQuantity('');
    setMinThreshold('');
    setBuyingPriceDzd('');
    setSellingPriceDzd('');
    setLocationBin('');
    setCompatibility('');
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((p: SparePart) => {
    setPartToEdit(p);
    setName(p.name);
    setSku(p.sku);
    setCategory(p.category);
    setStockQuantity(String(p.stockQuantity));
    setMinThreshold(String(p.minThreshold));
    setBuyingPriceDzd(String(p.buyingPriceDzd));
    setSellingPriceDzd(String(p.sellingPriceDzd));
    setLocationBin(p.locationBin);
    setCompatibility(p.compatibility?.join(', ') || '');
    setIsModalOpen(true);
  }, []);

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedStock = parseInt(stockQuantity, 10);
    const parsedMin = minThreshold === '' ? 1 : parseInt(minThreshold, 10);
    const parsedBuy = parseFloat(buyingPriceDzd);
    const parsedSell = parseFloat(sellingPriceDzd);
    if (
      !name.trim() ||
      !sku.trim() ||
      isNaN(parsedStock) ||
      parsedStock < 0 ||
      isNaN(parsedBuy) ||
      parsedBuy < 0 ||
      isNaN(parsedSell) ||
      parsedSell < 0
    ) {
      showToast({
        type: 'error',
        title: isAr ? 'خطأ' : 'Champs requis',
        message: isAr
          ? 'يرجى إدخال الاسم ورمز SKU والكمية والأسعار بشكل صحيح'
          : 'Veuillez saisir le nom, le SKU, la quantité et les tarifs valides',
      });
      return;
    }
    const activeAccountId = (partToEdit?.accountId || currentBranch?.accountId || account?.id || '').trim();
    const activeBranchId = (partToEdit?.branchId || currentBranch?.id || '').trim();
    if (!activeAccountId || !activeBranchId) {
      showToast({
        type: 'error',
        title: t('tenant_context_missing_title', language),
        message: t('tenant_context_missing_msg', language),
      });
      return;
    }
    const payload: SparePart = {
      id: partToEdit?.id || `part_${Date.now()}`,
      accountId: activeAccountId,
      businessId: currentBusiness?.id || currentBranch?.businessId || '',
      branchId: activeBranchId,
      staffId: currentUser?.id || '',
      name: name.trim(),
      sku: sku.trim(),
      category: category as SparePart['category'],
      stockQuantity: parsedStock,
      minThreshold: isNaN(parsedMin) ? 1 : Math.max(0, parsedMin),
      buyingPriceDzd: parsedBuy,
      sellingPriceDzd: parsedSell,
      locationBin: locationBin.trim(),
      compatibility: compatibility
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      createdAt: partToEdit?.createdAt || new Date().toISOString(),
    };
    if (partToEdit) {
      updatePart(payload);
      if (inspectedPart?.id === payload.id) setInspectedPart(payload);
    } else {
      addPart(payload);
      setInspectedPart(payload);
    }
    setIsModalOpen(false);
  };

  const handlePin = useCallback(
    (p: SparePart) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(p.id)) next.delete(p.id);
        else next.add(p.id);
        return next;
      });
      showToast({
        type: 'info',
        title: p.sku,
        message: pinnedIds.has(p.id)
          ? isAr
            ? 'تم إلغاء التثبيت'
            : 'Référence désépinglée'
          : isAr
          ? 'تم تثبيت الصنف'
          : 'Référence épinglée',
      });
    },
    [pinnedIds, isAr]
  );

  const handleDelete = useCallback(
    (p: SparePart) => {
      deletePart(p.id);
      if (inspectedPart?.id === p.id) setInspectedPart(null);
    },
    [deletePart, inspectedPart]
  );

  const handleQuickAddStock = useCallback(
    (p: SparePart) => {
      const updated: SparePart = {
        ...p,
        stockQuantity: p.stockQuantity + 5,
      };
      updatePart(updated);
      if (inspectedPart?.id === p.id) setInspectedPart(updated);
    },
    [updatePart, inspectedPart]
  );

  const handleExportCsv = useCallback(() => {
    const headers = [
      'SKU',
      'Désignation',
      'Catégorie',
      'Succursale',
      'Emplacement',
      'Stock',
      'Seuil Min',
      'Prix Achat DZD',
      'Prix Vente DZD',
    ];
    const rows = sortedParts.map((p) => {
      const branchInfo = resolveRecordBranch(p, branchesById, currentBranch, language);
      return [
        p.sku,
        p.name,
        p.category,
        branchInfo.name,
        p.locationBin,
        String(p.stockQuantity),
        String(p.minThreshold),
        String(p.buyingPriceDzd),
        String(p.sellingPriceDzd),
      ];
    });
    downloadCsvSafe(`magasin_pieces_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast({
      type: 'info',
      title: isAr ? 'تصدير CSV' : 'Export CSV',
      message: isAr ? 'تم تصدير ملف قطع الغيار CSV' : 'Export CSV des pièces généré',
    });
  }, [sortedParts, branchesById, currentBranch, language, isAr]);

  const handleSaveNotes = useCallback(
    (next: string) => {
      if (!activePart) return;
      setInspectorNotes(next);
      showToast({
        type: 'success',
        title: activePart.sku,
        message: isAr ? 'تم حفظ تعليمات التخزين' : 'Consignes de stockage enregistrées',
      });
    },
    [activePart, isAr]
  );

  const getRowMeta = useCallback(
    (p: SparePart): Partial<KineticRowData> => {
      const isLow = p.stockQuantity <= p.minThreshold;
      const br = resolveRecordBranch(p, branchesById, currentBranch, language);
      return {
        title: p.name,
        subline: `${p.sku} · ${p.locationBin}`,
        categoryLabel: p.category,
        statusLabel: `${p.stockQuantity} u.`,
        statusVariant: isLow ? 'warning' : 'active',
        metricPrimary: formatMoney(p.sellingPriceDzd, language),
        metricSecondary: `Min: ${p.minThreshold}`,
        branchName: br.name,
        branchCode: br.code,
        detailCol1: {
          heading: isAr ? 'المرجع والتصنيف' : isEn ? 'SKU & Category' : 'Réf & Catégorie',
          primaryText: p.sku,
          secondaryText: `${p.category} · ${p.locationBin}`,
        },
        detailCol2: {
          heading: isAr ? 'الأسعار والهامش' : isEn ? 'Pricing' : 'Tarifs Achat / Vente',
          primaryText: formatMoney(p.sellingPriceDzd, language),
          secondaryText: `${isAr ? 'شراء' : isEn ? 'Buy' : 'Achat'}: ${formatMoney(p.buyingPriceDzd, language)}`,
        },
        detailCol3: {
          heading: isAr ? 'المخزون والفرع' : isEn ? 'Stock & Branch' : 'Stock & Succursale',
          primaryText: `${p.stockQuantity} ${isAr ? 'وحدة' : isEn ? 'units' : 'u.'} (Min ${p.minThreshold})`,
          secondaryText: br.name,
        },
      };
    },
    [branchesById, currentBranch, language, isAr, isEn]
  );

  const getFanActions = useCallback(
    (p: SparePart): KineticRowFanAction[] => [
      {
        id: 'addStock',
        label: '+5',
        icon: <Plus size={14} />,
        onClick: () => handleQuickAddStock(p),
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : 'Éditer',
        icon: <Edit size={14} />,
        onClick: () => openEditModal(p),
      },
    ],
    [handleQuickAddStock, openEditModal, isAr]
  );

  const getDetailActions = useCallback(
    (p: SparePart): KineticDetailAction[] => [
      {
        id: 'addStock',
        label: isAr ? 'إضافة +5 مخزون' : 'Réappro +5',
        icon: <Plus size={14} />,
        onClick: () => handleQuickAddStock(p),
      },
      {
        id: 'edit',
        label: isAr ? 'تعديل' : 'Modifier',
        icon: <Edit size={14} />,
        onClick: () => openEditModal(p),
      },
    ],
    [handleQuickAddStock, openEditModal, isAr]
  );

  const columns: ColumnDefinition<SparePart>[] = useMemo(
    () => [
      {
        key: 'sku',
        header: isAr ? 'رمز القطعة' : 'SKU / Réf',
        width: '1.6*',
        sortable: true,
        renderCell: (p) => (
          <div className="flex items-center gap-2">
            <div
              data-sq="ctl-sm"
              data-sq-border="none"
              className="w-8 h-8 bg-orange-50 dark:bg-orange-950/40 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center tabular-nums font-semibold t-small shrink-0"
            >
              <Boxes size={16} />
            </div>
            <div className="min-w-0">
              <div className="tabular-nums font-semibold t-small text-black dark:text-white flex items-center gap-2">
                <span>{p.sku}</span>
                {pinnedIds.has(p.id) && <Pin size={10} className="fill-[#d4522f] text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />}
              </div>
              <div className="t-cap text-black/55 dark:text-white/55 truncate">{p.locationBin}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'name',
        header: isAr ? 'اسم الصنف' : isEn ? 'Part Description' : 'Désignation Pièce',
        width: '2.5*',
        sortable: true,
        renderCell: (p) => (
          <div className="min-w-0">
            <div className="font-semibold t-small text-black dark:text-white line-clamp-1">{p.name}</div>
            <div className="t-cap text-black/55 dark:text-white/55">{p.category}</div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'المستودع / الفرع' : isEn ? 'Branch' : 'Succursale',
        width: '1.5*',
        sortable: true,
        renderCell: (p) => {
          const info = resolveRecordBranch(p, branchesById, currentBranch, language);
          return (
            <span className="t-small font-medium text-black/75 dark:text-white/80 truncate block">
              {info.name}
            </span>
          );
        },
      },
      {
        key: 'stockQuantity',
        header: isAr ? 'الكمية المتوفرة' : isEn ? 'Stock' : 'Stock en Rayon',
        width: '1.3*',
        sortable: true,
        renderCell: (p) => {
          const isLow = p.stockQuantity <= p.minThreshold;
          return (
            <div className="flex items-center gap-2">
              <span
                className={`tabular-nums font-semibold t-small px-2 py-1 rounded-full ${
                  isLow
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}
              >
                {p.stockQuantity} u.
              </span>
              {isLow && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
            </div>
          );
        },
      },
      {
        key: 'sellingPrice',
        header: isAr ? 'سعر البيع' : isEn ? 'Sale Price' : 'Prix de Vente',
        width: '1.5*',
        sortable: true,
        renderCell: (p) => (
          <div>
            <div className="tabular-nums font-semibold t-small text-black dark:text-white">
              {formatMoney(p.sellingPriceDzd, language)}
            </div>
            <div className="t-cap text-black/55 dark:text-white/55">
              Achat: {formatMoney(p.buyingPriceDzd, language)}
            </div>
          </div>
        ),
      },
      {
        key: 'locationBin',
        header: isAr ? 'الموقع' : isEn ? 'Bin' : 'Emplacement',
        width: '1.3*',
        sortable: true,
        renderCell: (p) => (
          <div className="flex items-center gap-1 t-cap text-black/70 dark:text-white/75">
            <MapPin size={12} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />
            <span className="truncate">{p.locationBin}</span>
          </div>
        ),
      },
    ],
    [isAr, isEn, pinnedIds, branchesById, currentBranch, language]
  );

  const hasAdvancedFilters = branchFilter !== 'All' || !['All', 'LowStock', 'Healthy'].includes(categoryFilter);
  const activeAdvancedCount =
    (branchFilter !== 'All' ? 1 : 0) +
    (!['All', 'LowStock', 'Healthy'].includes(categoryFilter) ? 1 : 0);

  const filterSections: KineticFilterSection[] = useMemo(
    () => [
      {
        id: 'category',
        label: isAr ? 'الفئة وحالة المخزون' : isEn ? 'Category & Stock' : 'Catégorie & Alertes',
        value: categoryFilter,
        onChange: setCategoryFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'الكل' : 'Toutes', count: parts.length },
          { value: 'LowStock', label: isAr ? 'تنبيهات النقص' : 'Alertes Stock Bas', count: lowStockCount },
          { value: 'Healthy', label: isAr ? 'مخزون آمن' : 'Stock Disponible', count: normalStockCount },
          ...PART_CATEGORIES.map((cat) => ({
            value: cat,
            label: cat,
            count: parts.filter((p) => p.category === cat).length,
          })),
        ],
      },
      {
        id: 'branch',
        label: isAr ? 'المستودع / الفرع' : isEn ? 'Branch' : 'Succursale',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: [
          { value: 'All', label: isAr ? 'كل الفروع' : isEn ? 'All Branches' : 'Toutes', count: parts.length },
          ...Array.from(branchCounts.entries()).map(([bName, count]) => ({
            value: bName,
            label: bName,
            count,
          })),
        ],
      },
    ],
    [isAr, isEn, categoryFilter, branchFilter, parts, lowStockCount, normalStockCount, branchCounts]
  );

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (categoryFilter !== 'All') {
      chips.push({
        key: 'category',
        label:
          categoryFilter === 'LowStock'
            ? isAr
              ? 'تنبيهات النقص'
              : 'Alertes Stock Bas'
            : categoryFilter === 'Healthy'
            ? isAr
              ? 'مخزون آمن'
              : 'Stock Disponible'
            : categoryFilter,
        onRemove: () => setCategoryFilter('All'),
      });
    }
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : 'Succursale'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    return chips;
  }, [categoryFilter, branchFilter, isAr]);

  const handleResetAllFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('All');
    setBranchFilter('All');
  }, []);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: parts.length > 0,
  });

  if (showSkeleton && (parts.length === 0 || networkMode === 'force_skeleton')) {
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
        isTimedOut={isTimedOut || isSyncTimeout}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Boxes size={26} />}
        title={isAr ? 'قطع الغيار والمشتريات' : isEn ? 'Parts & Purchasing' : 'Pièces & Achats'}
        secondaryActions={
          <div className="flex flex-wrap items-center gap-2">
            <LiveSegmentedControl
              size="sm"
              value={activePartsTab}
              onValueChange={(v) => setActivePartsTab(v as 'catalog' | 'purchasing' | 'warranties')}
              options={[
                { value: 'catalog', label: isAr ? 'الكتالوج' : isEn ? 'Catalog' : 'Catalogue', count: parts.length },
                { value: 'purchasing', label: isAr ? 'الموردون والطلبيات' : isEn ? 'Suppliers & POs' : 'Achats & BL', count: purchaseOrders.length },
                { value: 'warranties', label: isAr ? 'الضمانات' : isEn ? 'Warranties' : 'Garanties' },
              ]}
            />
            <AtriumButton
              variant="secondary"
              size="sm"
              onClick={() => {
                const target = activePart || parts[0];
                setPoSupplierId(suppliers[0]?.id || '');
                setPoQuantity('10');
                setPoBlNumber('');
                if (target) {
                  setPoPartId(target.id);
                  setPoUnitCost(target.buyingPriceDzd ? String(target.buyingPriceDzd) : '');
                } else {
                  setPoUnitCost('');
                }
                setIsPoModalOpen(true);
              }}
              icon={<Package size={14} />}
            >
              {isAr ? 'طلبية مورد' : isEn ? 'Supplier PO' : 'Commande Fournisseur'}
            </AtriumButton>
          </div>
        }
        primaryAction={{
          label: isAr ? 'صنف جديد' : isEn ? 'New Part' : 'Nouvelle Référence',
          icon: <Plus size={16} strokeWidth={2.5} />,
          onClick: openCreateModal,
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr ? 'مؤشرات المستودع والقطع الحرجة' : isEn ? 'Inventory & Stock Alerts' : 'Niveaux de Stock & Approvisionnement'
        }
        language={language}
        primaryCard={{
          label: isAr ? 'أصناف متوفرة بشكل طبيعي' : isEn ? 'Healthy Stock SKUs' : 'Références Conformes',
          badgeText: isAr ? 'متوفرة' : isEn ? 'In Stock' : 'Stock OK',
          count: normalStockCount,
          isActive: categoryFilter === 'Healthy',
          onToggle: () => setCategoryFilter((prev) => (prev === 'Healthy' ? 'All' : 'Healthy')),
          tone: 'emerald',
          filteredLabel: isAr ? 'تمت التصفية' : 'Filtre actif',
        }}
        secondaryCard={{
          label: isAr ? 'قطع تحت حد الأمان' : isEn ? 'Low Stock Alerts' : 'Alertes Réapprovisionnement',
          badgeText: isAr ? 'حرج' : isEn ? 'Low Stock' : 'Seuil Bas',
          count: lowStockCount,
          isActive: categoryFilter === 'LowStock',
          onToggle: () => setCategoryFilter((prev) => (prev === 'LowStock' ? 'All' : 'LowStock')),
          tone: 'terracotta',
          filteredLabel: isAr ? 'تمت التصفية' : 'Filtre actif',
        }}
        darkCard={{
          label: isAr ? 'القيمة التقديرية للمخزون' : isEn ? 'Total Stock Valuation' : 'Valeur Estimée Stock',
          badgeCount: totalStockUnits,
          badgeSuffix: isAr ? ' وحدة' : ' u.',
          valueCount: totalValuation,
          valueSuffix: ' DA',
          caption: isAr ? 'تقييم المخزون بسعر البيع الورشة' : 'Valorisation active prix vente atelier',
        }}
      />

      {activePartsTab !== 'catalog' ? (
        <AutoGaragePurchasingPanel mode={activePartsTab} language={language} />
      ) : (
      <ScreenPod>
        <ScreenCollectionToolbar
          title={isAr ? 'كتالوج قطع الغيار' : isEn ? 'Spare Parts Catalog' : 'Catalogue Pièces de Rechange'}
          language={language}
          liveRegionText={`${sortedParts.length} ${isAr ? 'صنف' : 'références'}`}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            isAr ? 'بحث بالرمز، الاسم، الفئة...' : 'Rechercher référence, désignation, rayon...'
          }
          statusValue={['All', 'LowStock', 'Healthy'].includes(categoryFilter) ? categoryFilter : 'All'}
          onStatusChange={setCategoryFilter}
          statusOptions={[
            { value: 'All', label: isAr ? 'الكل' : 'Toutes', count: parts.length },
            { value: 'LowStock', label: isAr ? 'تنبيهات' : 'Alertes', count: lowStockCount },
            { value: 'Healthy', label: isAr ? 'متوفر' : 'Conformes', count: normalStockCount },
          ]}
          hasActiveAdvancedFilters={hasAdvancedFilters}
          activeFiltersCount={activeAdvancedCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((prev) => !prev)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showViewToggle
          onExport={handleExportCsv}
          activeChips={activeChips}
          onResetAllFilters={handleResetAllFilters}
        />

        <UniversalDataCollection
          hideToolbar
          items={sortedParts}
          columns={columns}
          keyExtractor={(p) => p.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode={viewMode}
          sortBy={sortBy}
          sortDirection={sortDir}
          onSortChange={(field, dir) => {
            setSortBy(field);
            setSortDir(dir);
          }}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          bulkSecondaryAction={{
            label: isAr ? 'إعادة طلب مجمّع' : 'Réassort groupé',
            icon: <Plus size={14} />,
            onClick: (ids) => {
              const resolved = resolveBatchSelection(Array.from(ids), sortedParts, (p) => p.id, 200);
              if (resolved.selectedItems.length === 0) {
                showToast({
                  type: 'warning',
                  title: isAr ? 'لا توجد قطع محددة' : 'Aucune référence sélectionnée',
                  message: isAr ? 'اختر قطعة غيار واحدة على الأقل.' : 'Sélectionnez au moins une référence de pièce.',
                });
                return;
              }
              setBulkRestockParts(resolved.selectedItems);
              setBulkRestockQty('5');
            },
          }}
          onBulkDelete={(ids) => {
            const count = ids.size;
            runUndoBatch(
              {
                operationType: 'bulk',
                vertical: 'auto_garage',
                affectedCount: count,
                summary: pickLocalizedText(language, {
                  fr: `${count} pièces retirées du stock`,
                  en: `${count} spare parts deleted`,
                  ar: `تم حذف ${count} قطع غيار`,
                }),
                toastTitle: pickLocalizedText(language, {
                  fr: 'Magasin Pièces',
                  en: 'Spare Parts',
                  ar: 'مخزن القطع',
                }),
              },
              () => {
                ids.forEach((id) => deletePart(id));
              }
            );
            setSelectedIds(new Set());
            if (inspectedPart && ids.has(inspectedPart.id)) setInspectedPart(null);
          }}
          isPinned={(p) => pinnedIds.has(p.id)}
          onTogglePin={handlePin}
          openItemId={activePart?.id || null}
          onItemClick={(p, el) => {
            setDrawerOpenerEl(el || null);
            setInspectedPart(p);
          }}
          onViewDetails={(p, el) => {
            setDrawerOpenerEl(el || null);
            setInspectedPart(p);
          }}
          getRowMeta={getRowMeta}
          getFanActions={getFanActions}
          getDetailActions={getDetailActions}
          onEdit={openEditModal}
          onDelete={handleDelete}
          customActions={(p) => [
            {
              id: 'addStock',
              label: isAr ? 'إضافة (+5)' : 'Réappro (+5)',
              icon: <Plus size={14} />,
              onClick: () => handleQuickAddStock(p),
            },
          ]}
        />
      </ScreenPod>
      )}

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedParts.length}
        entityPluralLabel={isAr ? 'صنف' : isEn ? 'parts' : 'références'}
        hasActiveFilters={categoryFilter !== 'All' || branchFilter !== 'All'}
        onResetFilters={handleResetAllFilters}
        sections={filterSections}
      />

      <KineticSlideOverInspector
        isOpen={Boolean(activePart)}
        item={activePart}
        allItems={sortedParts}
        keyExtractor={(p) => p.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activePart?.name || ''}
        subtitle={activePart ? `${activePart.sku} · ${activePart.category}` : ''}
        categoryLabel={activePart?.category || (isAr ? 'قطع الغيار' : 'Pièce')}
        avatarText={activePart?.sku.slice(-2) || 'PR'}
        branchName={
          activePart ? resolveRecordBranch(activePart, branchesById, currentBranch, language).name : ''
        }
        statusLabel={
          activePart && activePart.stockQuantity <= activePart.minThreshold
            ? isAr
              ? 'نقص مخزون'
              : 'Seuil Bas'
            : `${activePart?.stockQuantity || 0} u.`
        }
        statusClassName={
          activePart && activePart.stockQuantity <= activePart.minThreshold
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
            : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
        }
        tabs={[
          { id: 'fiche', label: isAr ? 'المواصفات' : 'Fiche Pièce' },
          { id: 'stock', label: isAr ? 'الأسعار' : 'Prix & Marges' },
          { id: 'compat', label: isAr ? 'التوافق' : 'Compatibilité' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectItem={(item) => setInspectedPart(item)}
        onClose={() => setInspectedPart(null)}
        onDelete={handleDelete}
        holdToDelete
        renderBody={(part, tab) => {
          const isLow = part.stockQuantity <= part.minThreshold;
          const stockRatio = Math.min(100, Math.round((part.stockQuantity / Math.max(1, part.minThreshold * 3)) * 100));

          if (tab === 'stock') {
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={formatMoney(part.stockQuantity * part.sellingPriceDzd, language)}
                    tone="accent"
                    caption={`Valeur totale en rayon (${part.stockQuantity} unités)`}
                  />
                </InspectorSection>
                <InspectorSection index={1} title={isAr ? 'الأسعار والهامش' : 'Tarification & Seuil'}>
                  <InspectorCard>
                    <InspectorKeyValue label="Prix Achat Fournisseur" value={formatMoney(part.buyingPriceDzd, language)} />
                    <InspectorKeyValue label="Prix Vente Client" value={formatMoney(part.sellingPriceDzd, language)} tone="ok" />
                    <InspectorKeyValue
                      label="Marge Brute Unitaire"
                      value={formatMoney(part.sellingPriceDzd - part.buyingPriceDzd, language)}
                      tone="accent"
                    />
                    <InspectorKeyValue label="Couverture Stock" value={`${part.stockQuantity} / ${part.minThreshold * 3} u.`} isLast />
                    <InspectorProgressBar percent={stockRatio} tone={isLow ? 'warn' : 'ok'} animateKey={part.id} />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }

          if (tab === 'compat') {
            return (
              <InspectorSection index={0} title={isAr ? 'المركبات المتوافقة' : 'Modèles & Motorisations Compatibles'}>
                {part.compatibility && part.compatibility.length > 0 ? (
                  <InspectorCard>
                    {part.compatibility.map((c, i) => (
                      <InspectorListItem
                        key={i}
                        title={c}
                        badge={{ label: 'OE', tone: 'ok' }}
                        isLast={i === (part.compatibility?.length || 1) - 1}
                      />
                    ))}
                  </InspectorCard>
                ) : (
                  <InspectorCard>
                    <InspectorKeyValue label="Compatibilité" value="Référence universelle / adaptable" mono={false} isLast />
                  </InspectorCard>
                )}
              </InspectorSection>
            );
          }

          return (
            <>
              <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : 'Actions rapides'}>
                <InspectorQuickActions
                  actions={[
                    {
                      id: 'addStock',
                      label: isAr ? '+5 مخزون' : '+5 Stock',
                      icon: <Plus className="w-[18px] h-[18px]" />,
                      primary: true,
                      onClick: () => handleQuickAddStock(part),
                    },
                    {
                      id: 'edit',
                      label: isAr ? 'تعديل' : 'Modifier',
                      icon: <Edit className="w-[18px] h-[18px]" />,
                      onClick: () => openEditModal(part),
                    },
                    {
                      id: 'pin',
                      label: pinnedIds.has(part.id) ? 'Désépingler' : 'Épingler',
                      icon: <Pin className="w-[18px] h-[18px]" />,
                      onClick: () => handlePin(part),
                    },
                  ]}
                />
              </InspectorSection>

              <InspectorSection index={1} title={isAr ? 'المواصفات المخزنية' : 'Fiche Magasin'}>
                <InspectorCard>
                  <InspectorKeyValue label="Code SKU Atelier" value={part.sku} />
                  <InspectorKeyValue label="Catégorie" value={part.category} mono={false} />
                  <InspectorKeyValue label="Emplacement Rayon" value={part.locationBin} tone="accent" mono={false} />
                  <InspectorKeyValue label="Quantité Stock" value={`${part.stockQuantity} unités`} tone={isLow ? 'warn' : 'ok'} />
                  <InspectorKeyValue label="Seuil d’Alerte Min" value={`${part.minThreshold} unités`} isLast />
                </InspectorCard>
              </InspectorSection>

              <InspectorSection index={2} title={isAr ? 'التعليمات' : 'Consignes de stockage'}>
                <InspectorNotesField
                  value={inspectorNotes}
                  onSave={handleSaveNotes}
                  placeholder={
                    isAr
                      ? 'تعليمات التخزين، المورد المفضل...'
                      : 'Noter les détails de conditionnement, références équivalentes OE...'
                  }
                />
              </InspectorSection>
            </>
          );
        }}
      />

      <KineticModalShell
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidthClass="max-w-lg"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
        ariaLabel={
          partToEdit
            ? isAr
              ? 'تعديل صنف قطعة الغيار'
              : 'Modifier la Référence'
            : isAr
            ? 'إضافة صنف جديد للمخزن'
            : 'Nouvelle Référence Magasin'
        }
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
            <div className="flex items-center gap-2">
              <div
                data-sq="tile"
                data-sq-border="none"
                className="w-9 h-9 bg-orange-50 dark:bg-orange-950/40 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] flex items-center justify-center font-semibold"
              >
                <Boxes size={20} />
              </div>
              <div>
                <h2 className="t-card font-semibold text-black dark:text-white">
                  {partToEdit
                    ? isAr
                      ? 'تعديل صنف قطعة الغيار'
                      : 'Modifier la Référence'
                    : isAr
                    ? 'إضافة صنف جديد للمخزن'
                    : 'Nouvelle Référence Magasin'}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              aria-label={isAr ? 'إغلاق' : 'Fermer'}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSaveModal} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="partSku"
                label={isAr ? 'رمز SKU *' : 'Code SKU *'}
                placeholder="PR-1029"
                value={sku}
                onChange={setSku}
                width="100%"
                height={40}
                corner={12}
                required
              />
              <LabelSelect
                field="partCategory"
                label={isAr ? 'الفئة' : 'Catégorie'}
                value={category}
                onChange={setCategory}
                options={PART_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                width="100%"
                height={40}
                corner={12}
              />
            </div>
            <LabelInput
              field="partName"
              label={isAr ? 'اسم وتعيين القطعة *' : 'Désignation de la Pièce *'}
              placeholder="Ex: Jeu 4 Plaquettes de frein avant"
              value={name}
              onChange={setName}
              width="100%"
              height={40}
              corner={12}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="partStockQuantity"
                label={isAr ? 'الكمية في المخزن' : 'Quantité Stock'}
                type="number"
                placeholder="10"
                value={stockQuantity}
                onChange={setStockQuantity}
                width="100%"
                height={40}
                corner={12}
                required
              />
              <LabelInput
                field="partMinThreshold"
                label={isAr ? 'حد الأمان الأدنى' : 'Seuil d’Alerte Min'}
                type="number"
                placeholder="4"
                value={minThreshold}
                onChange={setMinThreshold}
                width="100%"
                height={40}
                corner={12}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="partBuyingPrice"
                label={isAr ? 'سعر الشراء (دج)' : 'Prix d’Achat (DZD)'}
                type="number"
                placeholder="4000"
                value={buyingPriceDzd}
                onChange={setBuyingPriceDzd}
                width="100%"
                height={40}
                corner={12}
                required
              />
              <LabelInput
                field="partSellingPrice"
                label={isAr ? 'سعر البيع (دج)' : 'Prix de Vente (DZD)'}
                type="number"
                placeholder="6500"
                value={sellingPriceDzd}
                onChange={setSellingPriceDzd}
                width="100%"
                height={40}
                corner={12}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="partLocationBin"
                label={isAr ? 'موقع التخزين / الرف' : 'Emplacement / Rayon'}
                placeholder="Ex: Rayon B-04"
                value={locationBin}
                onChange={setLocationBin}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                field="partCompatibility"
                label={isAr ? 'التوافق' : 'Compatibilité (marques)'}
                placeholder="Ex: Renault Clio 4, Dacia Sandero"
                value={compatibility}
                onChange={setCompatibility}
                width="100%"
                height={40}
                corner={12}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsModalOpen(false)}>
                {isAr ? 'إلغاء' : 'Annuler'}
              </Button>
              <Button type="submit" tone="accent" size={40}>
                {partToEdit ? (isAr ? 'حفظ التعديلات' : 'Enregistrer') : isAr ? 'تسجيل القطعة' : 'Ajouter au Stock'}
              </Button>
            </div>
          </form>
        </div>
      </KineticModalShell>

      <KineticModalShell
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        maxWidthClass="max-w-lg"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
        ariaLabel={isAr ? 'طلبية تموين من المورد (Bon de Commande)' : 'Bon de Commande Fournisseur Gros'}
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full max-h-[92vh] overflow-y-auto p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[var(--atr-divider)] pb-3">
            <div className="flex items-center gap-2">
              <div
                data-sq="tile"
                data-sq-border="none"
                className="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-semibold"
              >
                <Package size={20} />
              </div>
              <div>
                <h2 className="t-card font-semibold text-black dark:text-white">
                  {isAr ? 'طلبية تموين من المورد (Bon de Commande)' : 'Bon de Commande Fournisseur Gros'}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPoModalOpen(false)}
              aria-label={isAr ? 'إغلاق' : 'Fermer'}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const target = parts.find((p) => p.id === poPartId);
              const supplier = suppliers.find((s) => s.id === poSupplierId) || suppliers[0];
              const qty = parseInt(poQuantity, 10);
              const cost = poUnitCost === '' ? target?.buyingPriceDzd : parseFloat(poUnitCost);
              if (!target || !supplier || isNaN(qty) || qty <= 0 || cost === undefined || isNaN(cost) || cost < 0) {
                showToast({
                  type: 'error',
                  title: isAr ? 'خطأ' : 'Champs requis',
                  message: isAr ? 'يرجى تحديد المورد والقطعة والكمية والسعر بشكل صحيح' : 'Veuillez sélectionner un fournisseur, une pièce, une quantité et un prix valides',
                });
                return;
              }
              const po = createPurchaseOrder({
                supplierId: supplier.id,
                supplierName: supplier.name,
                items: [
                  {
                    partId: target.id,
                    sku: target.sku,
                    name: target.name,
                    quantity: qty,
                    unitCostDzd: cost,
                  },
                ],
                warrantyMonths: 12,
                status: 'Ordered',
              });
              if (poBlNumber.trim()) {
                receivePurchaseOrderWithBl({
                  poId: po.id,
                  deliveryNoteNumber: poBlNumber.trim(),
                  receivedByName: currentUser?.fullName || 'Magasinier',
                });
                showToast({
                  type: 'success',
                  title: po.poNumber,
                  message: isAr
                    ? `تم إنشاء الطلب واستلام وصل التسليم ${poBlNumber.trim()}`
                    : `BC ${po.poNumber} reçu sur BL ${poBlNumber.trim()} · Stock mis à jour`,
                });
              } else {
                showToast({
                  type: 'success',
                  title: po.poNumber,
                  message: isAr
                    ? `تم إنشاء طلبية الشراء ${po.poNumber} بانتظار الاستلام`
                    : `Bon de commande ${po.poNumber} enregistré (en attente de BL)`,
                });
              }
              setIsPoModalOpen(false);
            }}
            className="space-y-4"
          >
            <LabelSelect
              field="poSupplierId"
              label={isAr ? 'المورد المعتمد' : 'Fournisseur Référent'}
              value={poSupplierId || suppliers[0]?.id || ''}
              onChange={setPoSupplierId}
              options={suppliers.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.wilaya})`,
              }))}
              width="100%"
              height={40}
              corner={12}
            />
            <LabelSelect
              field="poPartId"
              label={isAr ? 'القطعة المراد تموينها' : 'Référence Pièce à Réapprovisionner'}
              value={poPartId}
              onChange={(nextId) => {
                setPoPartId(nextId);
                const p = parts.find((item) => item.id === nextId);
                if (p) setPoUnitCost(String(p.buyingPriceDzd));
              }}
              options={parts.map((p) => ({
                value: p.id,
                label: `${p.sku} — ${p.name} (Stock: ${p.stockQuantity} u.)`,
              }))}
              width="100%"
              height={40}
              corner={12}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="poQuantity"
                label={isAr ? 'الكمية المطلوبة *' : 'Quantité Commandée *'}
                type="number"
                placeholder="10"
                value={poQuantity}
                onChange={setPoQuantity}
                width="100%"
                height={40}
                corner={12}
                required
              />
              <LabelInput
                field="poUnitCost"
                label={isAr ? 'سعر الشراء الفردي (دج)' : 'Prix Achat Unitaire (DZD)'}
                type="number"
                placeholder="4000"
                value={poUnitCost}
                onChange={setPoUnitCost}
                width="100%"
                height={40}
                corner={12}
                required
              />
            </div>
            <LabelInput
              field="poBlNumber"
              label={isAr ? 'رقم وصل التسليم (اختياري للاستلام الفوري)' : 'N° Bon de Livraison BL (optionnel pour réception immédiate)'}
              placeholder="BL-2026-0042"
              value={poBlNumber}
              onChange={setPoBlNumber}
              width="100%"
              height={40}
              corner={12}
            />
            <div
              data-sq="card"
              data-sq-border="none"
              className="p-4 bg-[#F5F1EC] dark:bg-[#22201E] flex items-center justify-between t-cap"
            >
              <span className="text-black/55 dark:text-white/55">
                {isAr ? 'إجمالي قيمة الطلبية HT:' : 'Montant Total Commande HT:'}
              </span>
              <span className="tabular-nums font-semibold t-card text-black dark:text-white">
                {formatMoney((parseInt(poQuantity, 10) || 0) * (parseFloat(poUnitCost) || 0), language)}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsPoModalOpen(false)}>
                {isAr ? 'إلغاء' : 'Annuler'}
              </Button>
              <Button type="submit" tone="accent" size={40} leading={<Check size={14} />}>
                {poBlNumber.trim()
                  ? isAr ? 'إنشاء واستلام وصل التسليم' : 'Créer & Réceptionner (BL)'
                  : isAr ? 'تسجيل طلبية الشراء' : 'Enregistrer Bon de Commande'}
              </Button>
            </div>
          </form>
        </div>
      </KineticModalShell>

      <KineticModalShell
        isOpen={Boolean(bulkRestockParts)}
        onClose={() => setBulkRestockParts(null)}
        maxWidthClass="max-w-lg"
        zIndexClass="z-50"
        scrimClassName="bg-black/50"
      >
        {bulkRestockParts && (
          <div
            data-sq="panel"
            data-sq-border="solid"
            className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] p-6 w-full space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
              <h3 className="font-semibold t-card text-black dark:text-white">
                {isAr
                  ? `إعادة تموين مجمّع (${bulkRestockParts.length})`
                  : `Réassort Groupé (${bulkRestockParts.length} références)`}
              </h3>
              <button
                type="button"
                aria-label={isAr ? 'إغلاق' : 'Fermer'}
                onClick={() => setBulkRestockParts(null)}
                className="p-1 text-black/55 dark:text-white/55 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <LabelInput
              field="bulkRestockQty"
              label={isAr ? 'الكمية المضافة لكل قطعة' : 'Quantité à ajouter par référence'}
              type="number"
              value={bulkRestockQty}
              onChange={setBulkRestockQty}
              width="100%"
              height={40}
              corner={12}
              required
            />

            <div className="max-h-48 overflow-y-auto divide-y divide-black/[0.06] dark:divide-white/[0.08] rounded-xl border border-black/[0.08] dark:border-white/[0.08]">
              {bulkRestockParts.map((part) => (
                <div key={part.id} className="px-3 py-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-black dark:text-white truncate">
                    {part.sku} · {part.name}
                  </span>
                  <span className="tabular-nums text-black/60 dark:text-white/65 shrink-0 ms-2">
                    {part.stockQuantity} → {part.stockQuantity + Math.max(1, parseInt(bulkRestockQty, 10) || 1)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--atr-divider)]">
              <Button
                type="button"
                tone="soft"
                size={36}
                onClick={() => {
                  const qty = Math.max(1, parseInt(bulkRestockQty, 10) || 1);
                  downloadCsvSafe(
                    `reassort-pieces-${new Date().toISOString().slice(0, 10)}.csv`,
                    ['SKU', 'Désignation', 'Stock Actuel', 'Qté Commandée', 'Coût Unitaire'],
                    bulkRestockParts.map((p) => [p.sku, p.name, p.stockQuantity, qty, p.buyingPriceDzd])
                  );
                }}
              >
                CSV
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" tone="soft" size={40} onClick={() => setBulkRestockParts(null)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </Button>
                <Button
                  type="button"
                  tone="accent"
                  size={40}
                  leading={<Check size={14} />}
                  onClick={() => {
                    const qty = Math.max(1, parseInt(bulkRestockQty, 10) || 1);
                    bulkRestockParts.forEach((p) => {
                      updatePart({ ...p, stockQuantity: (p.stockQuantity || 0) + qty });
                    });
                    showToast({
                      type: 'success',
                      title: isAr ? 'تم التموين' : 'Réassort enregistré',
                      message: isAr
                        ? `تمت إضافة +${qty} لـ ${bulkRestockParts.length} قطع`
                        : `+${qty} unités ajoutées sur ${bulkRestockParts.length} référence(s).`,
                    });
                    setBulkRestockParts(null);
                    setSelectedIds(new Set());
                  }}
                >
                  {isAr ? 'تأكيد التموين' : 'Valider Réassort'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </KineticModalShell>
    </div>
  );
};
