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
  showToast,
} from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useGarageData, SparePart } from './garageData';
import { AtriumButton } from '../../ui/AtriumButton';
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
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const extractStr = (eOrVal: any): string =>
  eOrVal?.target?.value !== undefined ? String(eOrVal.target.value) : String(eOrVal ?? '');

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
      language: s.language,
      currentBusiness: s.currentBusiness,
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

  const { parts, addPart, updatePart, deletePart } = useGarageData();

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
  const [stockQuantity, setStockQuantity] = useState('10');
  const [minThreshold, setMinThreshold] = useState('4');
  const [buyingPriceDzd, setBuyingPriceDzd] = useState('4000');
  const [sellingPriceDzd, setSellingPriceDzd] = useState('6500');
  const [locationBin, setLocationBin] = useState('Rayon A-01');
  const [compatibility, setCompatibility] = useState('Renault, Dacia, Peugeot');

  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [poSupplier, setPoSupplier] = useState('Comptoir Pièces Bab Ezzouar (Alger)');
  const [poPartId, setPoPartId] = useState(parts[0]?.id || 'p_01');
  const [poQuantity, setPoQuantity] = useState('10');
  const [poUnitCost, setPoUnitCost] = useState('4000');

  const [inspectedPart, setInspectedPart] = useState<SparePart | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>('fiche');
  const [inspectorNotes, setInspectorNotes] = useState('');

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
    setSku(`PR-${Math.floor(1000 + Math.random() * 9000)}`);
    setCategory('Freinage');
    setStockQuantity('10');
    setMinThreshold('4');
    setBuyingPriceDzd('4000');
    setSellingPriceDzd('6500');
    setLocationBin('Rayon A-01');
    setCompatibility('Multi-marques');
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
    if (!name.trim() || !sku.trim()) {
      showToast({
        type: 'error',
        title: isAr ? 'خطأ' : 'Champs requis',
        message: isAr ? 'يرجى إدخال اسم القطعة ورمز SKU' : 'Veuillez saisir le nom et le SKU',
      });
      return;
    }
    const payload: SparePart = {
      id: partToEdit?.id || `part_${Date.now()}`,
      accountId: partToEdit?.accountId || 'acc_01',
      businessId: currentBusiness?.id || 'biz_garage',
      branchId: currentBranch?.id || 'branch_garage_main',
      staffId: currentUser?.id || 'staff_01',
      name: name.trim(),
      sku: sku.trim(),
      category: category as SparePart['category'],
      stockQuantity: parseInt(stockQuantity, 10) || 0,
      minThreshold: parseInt(minThreshold, 10) || 1,
      buyingPriceDzd: parseFloat(buyingPriceDzd) || 0,
      sellingPriceDzd: parseFloat(sellingPriceDzd) || 0,
      locationBin: locationBin.trim() || 'Rayon A-01',
      compatibility: compatibility
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      createdAt: partToEdit?.createdAt || new Date().toISOString(),
    };
    if (partToEdit) {
      updatePart(payload);
      if (inspectedPart?.id === payload.id) setInspectedPart(payload);
      showToast({
        type: 'success',
        title: payload.sku,
        message: isAr ? 'تم تحديث بيانات الصنف' : 'Pièce mise à jour avec succès',
      });
    } else {
      addPart(payload);
      setInspectedPart(payload);
      showToast({
        type: 'success',
        title: payload.sku,
        message: isAr ? 'تمت إضافة صنف جديد للمخزن' : 'Nouvelle référence enregistrée',
      });
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
      showToast({
        type: 'success',
        title: isAr ? 'حذف' : 'Supprimé',
        message: isAr ? 'تم حذف القطعة من المخزن' : 'Référence retirée du stock',
      });
    },
    [deletePart, inspectedPart, isAr]
  );

  const handleQuickAddStock = useCallback(
    (p: SparePart) => {
      const updated: SparePart = {
        ...p,
        stockQuantity: p.stockQuantity + 5,
      };
      updatePart(updated);
      if (inspectedPart?.id === p.id) setInspectedPart(updated);
      showToast({
        type: 'success',
        title: updated.sku,
        message: isAr
          ? `تمت زيادة المخزون (+5): ${updated.stockQuantity} وحدات`
          : `Stock réapprovisionné (+5) : ${updated.stockQuantity} unités`,
      });
    },
    [updatePart, inspectedPart, isAr]
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
    (p: SparePart): KineticRowData => {
      const isLow = p.stockQuantity <= p.minThreshold;
      const br = resolveRecordBranch(p, branchesById, currentBranch, language);
      return {
        primary: p.name,
        secondary: `${p.sku} · ${p.category} · ${p.locationBin}`,
        meta: `${formatMoney(p.sellingPriceDzd, language)} · ${br.name}`,
        badge: {
          label: `${p.stockQuantity} u.`,
          tone: isLow ? 'warn' : 'ok',
        },
      };
    },
    [branchesById, currentBranch, language]
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
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-mono font-bold text-xs shrink-0">
              <Boxes size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-mono font-bold text-xs text-black dark:text-white flex items-center gap-1.5">
                <span>{p.sku}</span>
                {pinnedIds.has(p.id) && <Pin size={10} className="fill-[#d4522f] text-[#d4522f]" />}
              </div>
              <div className="text-[10px] text-black/55 dark:text-white/55 truncate">{p.locationBin}</div>
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
            <div className="font-semibold text-xs text-black dark:text-white line-clamp-1">{p.name}</div>
            <div className="text-[11px] text-black/55 dark:text-white/55">{p.category}</div>
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
            <span className="text-xs font-medium text-black/75 dark:text-white/80 truncate block">
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
            <div className="flex items-center gap-1.5">
              <span
                className={`font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
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
            <div className="font-mono font-bold text-xs text-black dark:text-white">
              {formatMoney(p.sellingPriceDzd, language)}
            </div>
            <div className="text-[10px] text-black/55 dark:text-white/55">
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
          <div className="flex items-center gap-1 text-xs text-black/70 dark:text-white/75">
            <MapPin size={12} className="text-[#d4522f] shrink-0" />
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
        title={isAr ? 'قطع الغيار' : isEn ? 'Parts' : 'Pièces'}
        secondaryActions={
          <AtriumButton
            variant="secondary"
            size="sm"
            onClick={() => {
              const target = activePart || parts[0];
              if (target) {
                setPoPartId(target.id);
                setPoUnitCost(String(target.buyingPriceDzd));
              }
              setIsPoModalOpen(true);
            }}
            icon={<Package size={14} />}
          >
            {isAr ? 'طلبية مورد' : isEn ? 'Supplier PO' : 'Commande Fournisseur'}
          </AtriumButton>
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
              showToast({
                type: 'info',
                title: isAr ? 'تموين' : 'Réassort',
                message: isAr ? `تم تحضير أمر إعادة تموين لـ ${ids.size} قطع` : `Réassort préparé pour ${ids.size} références`,
              });
            },
          }}
          onBulkDelete={(ids) => {
            ids.forEach((id) => deletePart(id));
            setSelectedIds(new Set());
            if (inspectedPart && ids.has(inspectedPart.id)) setInspectedPart(null);
            showToast({
              type: 'success',
              title: isAr ? 'حذف' : 'Supprimé',
              message: isAr ? 'تم حذف القطع المحددة' : 'Pièces sélectionnées supprimées',
            });
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
            ? 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]'
            : 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]'
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#d4522f] flex items-center justify-center font-bold">
                  <Boxes size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                    {partToEdit
                      ? isAr
                        ? 'تعديل صنف قطعة الغيار'
                        : 'Modifier la Référence'
                      : isAr
                      ? 'إضافة صنف جديد للمخزن'
                      : 'Nouvelle Référence Magasin'}
                  </h2>
                  <p className="text-xs text-black/55 dark:text-white/55">
                    {isAr ? 'البيانات الفنية، المخزون، والأسعار' : 'Gestion du catalogue pièces et seuils d’alerte'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label={isAr ? 'إغلاق' : 'Fermer'}
                className="p-1 rounded-lg text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'رمز SKU *' : 'Code SKU *'}
                  placeholder="PR-1029"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                />
                <LabelSelect
                  label={isAr ? 'الفئة' : 'Catégorie'}
                  value={category}
                  onChange={(v) => setCategory(extractStr(v))}
                  options={PART_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
                />
              </div>
              <LabelInput
                label={isAr ? 'اسم وتعيين القطعة *' : 'Désignation de la Pièce *'}
                placeholder="Ex: Jeu 4 Plaquettes de frein avant"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'الكمية في المخزن' : 'Quantité Stock'}
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'حد الأمان الأدنى' : 'Seuil d’Alerte Min'}
                  type="number"
                  value={minThreshold}
                  onChange={(e) => setMinThreshold(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'سعر الشراء (دج)' : 'Prix d’Achat (DZD)'}
                  type="number"
                  value={buyingPriceDzd}
                  onChange={(e) => setBuyingPriceDzd(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'سعر البيع (دج)' : 'Prix de Vente (DZD)'}
                  type="number"
                  value={sellingPriceDzd}
                  onChange={(e) => setSellingPriceDzd(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'موقع التخزين / الرف' : 'Emplacement / Rayon'}
                  placeholder="Ex: Rayon B-04"
                  value={locationBin}
                  onChange={(e) => setLocationBin(e.target.value)}
                />
                <LabelInput
                  label={isAr ? 'التوافق' : 'Compatibilité (marques)'}
                  placeholder="Ex: Renault Clio 4, Dacia Sandero"
                  value={compatibility}
                  onChange={(e) => setCompatibility(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit">
                  {partToEdit ? (isAr ? 'حفظ التعديلات' : 'Enregistrer') : isAr ? 'تسجيل القطعة' : 'Ajouter au Stock'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
                  <Package size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-black dark:text-white font-['Barlow_Condensed',sans-serif] rtl:font-sans">
                    {isAr ? 'طلبية تموين من المورد (Bon de Commande)' : 'Bon de Commande Fournisseur Gros'}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPoModalOpen(false)}
                aria-label={isAr ? 'إغلاق' : 'Fermer'}
                className="p-1 rounded-lg text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const target = parts.find((p) => p.id === poPartId);
                const qty = parseInt(poQuantity, 10) || 5;
                const cost = parseFloat(poUnitCost) || target?.buyingPriceDzd || 0;
                if (target) {
                  const updated: SparePart = {
                    ...target,
                    stockQuantity: target.stockQuantity + qty,
                    buyingPriceDzd: cost,
                  };
                  updatePart(updated);
                  if (inspectedPart?.id === target.id) setInspectedPart(updated);
                }
                showToast({
                  type: 'success',
                  title: isAr ? 'استلام طلبية' : 'Réception Stock',
                  message: isAr
                    ? `تم تسجيل استلام الطلبية (+${qty}) بنجاح من ${poSupplier}`
                    : `Bon d'entrée stock validé (+${qty} unités) depuis ${poSupplier}`,
                });
                setIsPoModalOpen(false);
              }}
              className="space-y-4"
            >
              <LabelSelect
                label={isAr ? 'المورد المعتمد' : 'Fournisseur Référent'}
                value={poSupplier}
                onChange={(v) => setPoSupplier(extractStr(v))}
                options={[
                  { value: 'Comptoir Pièces Bab Ezzouar (Alger)', label: 'Comptoir Pièces Bab Ezzouar (Alger)' },
                  { value: 'Sarl Maghreb Pièces Baraki (Alger)', label: 'Sarl Maghreb Pièces Baraki (Alger)' },
                  { value: 'Établissement Benali Distribution (El Eulma)', label: 'Éts Benali Distribution (El Eulma)' },
                  { value: 'Accumulateurs Algérie SPA (Oued Smar)', label: 'Accumulateurs Algérie SPA (Oued Smar)' },
                ]}
              />
              <LabelSelect
                label={isAr ? 'القطعة المراد تموينها' : 'Référence Pièce à Réapprovisionner'}
                value={poPartId}
                onChange={(v) => {
                  const nextId = extractStr(v);
                  setPoPartId(nextId);
                  const p = parts.find((item) => item.id === nextId);
                  if (p) setPoUnitCost(String(p.buyingPriceDzd));
                }}
                options={parts.map((p) => ({
                  value: p.id,
                  label: `${p.sku} — ${p.name} (Stock: ${p.stockQuantity} u.)`,
                }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <LabelInput
                  label={isAr ? 'الكمية المطلوبة *' : 'Quantité Commandée *'}
                  type="number"
                  value={poQuantity}
                  onChange={(e) => setPoQuantity(e.target.value)}
                  required
                />
                <LabelInput
                  label={isAr ? 'سعر الشراء الفردي (دج)' : 'Prix Achat Unitaire (DZD)'}
                  type="number"
                  value={poUnitCost}
                  onChange={(e) => setPoUnitCost(e.target.value)}
                  required
                />
              </div>
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs">
                <span className="text-black/55 dark:text-white/55">
                  {isAr ? 'إجمالي قيمة الطلبية HT:' : 'Montant Total Commande HT:'}
                </span>
                <span className="font-mono font-bold text-base text-black dark:text-white">
                  {formatMoney((parseInt(poQuantity, 10) || 0) * (parseFloat(poUnitCost) || 0), language)}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <AtriumButton variant="ghost" size="sm" onClick={() => setIsPoModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton variant="primary" size="sm" type="submit" icon={<Check size={14} />}>
                  {isAr ? 'تأكيد استلام السلعة بالمستودع' : 'Confirmer Réception en Stock'}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
