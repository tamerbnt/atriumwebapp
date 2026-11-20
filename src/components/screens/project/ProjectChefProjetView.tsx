import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  useAtriumStore,
  selectCurrentBranchFromState,
  showToast,
} from '../../../services/store';
import {
  PMCollateralItem,
  PMPrintOrder,
  PMBatDeliverable,
  PMExpense,
  PMProject,
} from '../../../types/index';
import {
  FolderKanban,
  ShoppingBag,
  FileCheck2,
  Plus,
  Trash2,
  Send,
  AlertTriangle,
  CheckCircle,
  Eye,
  MessageSquare,
  Printer,
  Pin,
  X,
  Receipt,
  Package,
  Truck,
  Ban,
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { FilterSelect } from '../../ui/FilterSelect';
import { LiveSegmentedControl } from '../../ui/live/LiveSegmentedControl';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import { OfflineRetryBanner } from '../../common/OfflineRetryBanner';
import { EmptyState } from '../../../atrium/components/EmptyState';
import {
  KineticEmptyStateMotion,
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
  InspectorWideButton,
  KineticRowData,
  KineticRowFanAction,
  KineticDetailAction,
  KineticStatusVariant,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

interface ProjectChefProjetViewProps {
  initialTab?: 'portfolio' | 'catalog' | 'orders' | 'bat' | 'expenses';
}

interface PrintCartLine {
  item: PMCollateralItem;
  quantity: number;
}

const getOrderStatusBadge = (
  status: string,
  language: string
): { label: string; variant: KineticStatusVariant; pillClass: string } => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  switch (status) {
    case 'sent_to_crea':
      return {
        label: isAr ? 'محال للتصميم' : isEn ? 'Sent to Crea' : 'Transmis Créa',
        variant: 'info',
        pillClass:
          'bg-[#E0F2FE] dark:bg-[#0C2D48] text-[#0369A1] dark:text-[#7DD3FC] border border-[#BAE6FD] dark:border-[#164E63]',
      };
    case 'bat_in_progress':
      return {
        label: isAr ? 'BAT قيد الإنجاز' : isEn ? 'BAT Proofing' : 'BAT en cours',
        variant: 'warning',
        pillClass:
          'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]',
      };
    case 'bat_approved':
      return {
        label: isAr ? 'BAT معتمد' : isEn ? 'BAT Approved' : 'BAT Validé',
        variant: 'active',
        pillClass:
          'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]',
      };
    case 'in_print':
    case 'sent_to_printer':
      return {
        label: isAr ? 'قيد الطباعة' : isEn ? 'At Printer' : "Chez l'Imprimeur",
        variant: 'warning',
        pillClass:
          'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
      };
    case 'delivered':
    case 'printed':
      return {
        label: isAr ? 'مطبوع ومُسلم' : isEn ? 'Delivered' : 'Imprimé & Livré',
        variant: 'active',
        pillClass:
          'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]',
      };
    default:
      return {
        label: status,
        variant: 'neutral',
        pillClass:
          'bg-[#F3EDE7] dark:bg-neutral-800 text-black/75 dark:text-white/80 border border-[#E6DED6] dark:border-neutral-700',
      };
  }
};

const getBatStatusBadge = (
  status: PMBatDeliverable['approvalStatus'],
  language: string
): { label: string; variant: KineticStatusVariant; pillClass: string } => {
  const isAr = language === 'ar';
  const isEn = language === 'en';
  if (status === 'approved') {
    return {
      label: isAr ? 'معتمد للطباعة' : isEn ? 'Approved' : 'Bon à Tirer Validé',
      variant: 'active',
      pillClass:
        'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80] border border-[#B5E8CE] dark:border-[#1E4D36]',
    };
  }
  if (status === 'revision_requested') {
    return {
      label: isAr ? 'تعديلات مطلوبة' : isEn ? 'Revision Requested' : 'Corrections Demandées',
      variant: 'blocked',
      pillClass:
        'bg-[#FDE4DF] dark:bg-[#3D1E1A] text-[#B8321C] dark:text-[#FF8D7A] border border-[#F5BDB3] dark:border-[#5C2B24]',
    };
  }
  return {
    label: isAr ? 'بانتظار المراجعة' : isEn ? 'Pending Review' : 'En Attente de Revue',
    variant: 'warning',
    pillClass:
      'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166] border border-[#F0D79B] dark:border-[#59471E]',
  };
};

export const ProjectChefProjetView: React.FC<ProjectChefProjetViewProps> = ({ initialTab }) => {
  const { t, language, isRtl } = useTranslation();
  const isAr = language === 'ar';
  const isEn = language === 'en';

  const state = useAtriumStore();
  const {
    currentBranch,
    branches,
    pmProjects,
    pmCollateralCatalog,
    pmPrintOrders,
    pmBatDeliverables,
    pmExpenses,
    addPmPrintOrder,
    batchUpdatePmPrintOrderStatus,
    batchDeletePmPrintOrders,
    reviewPmBatDeliverable,
    batchReviewPmBatDeliverables,
    batchDeletePmBatDeliverables,
    addPmExpense,
    batchDeletePmExpenses,
    activePmSubScreen,
    setActivePmSubScreen,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = state;

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const activeTab: 'portfolio' | 'catalog' | 'orders' | 'bat' | 'expenses' =
    activePmSubScreen === 'catalog' || initialTab === 'catalog'
      ? 'catalog'
      : activePmSubScreen === 'orders' || initialTab === 'orders'
      ? 'orders'
      : activePmSubScreen === 'bat' || activePmSubScreen === 'files' || initialTab === 'bat'
      ? 'bat'
      : activePmSubScreen === 'expenses' || initialTab === 'expenses'
      ? 'expenses'
      : 'portfolio';

  const setActiveTab = useCallback(
    (tab: string) => {
      setActivePmSubScreen(tab);
    },
    [setActivePmSubScreen]
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string>(pmProjects[0]?.id || '');
  const [cartItems, setCartItems] = useState<PrintCartLine[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [activeBatId, setActiveBatId] = useState<string | null>(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  // Catalog state
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [catalogViewMode, setCatalogViewMode] = useState<'list' | 'grid' | 'calendar'>('grid');
  const [isCatalogFilterOpen, setIsCatalogFilterOpen] = useState(false);
  const catalogFilterRef = useRef<HTMLButtonElement | null>(null);
  const [inspectedCatalog, setInspectedCatalog] = useState<PMCollateralItem | null>(null);
  const [catalogOpenerEl, setCatalogOpenerEl] = useState<HTMLElement | null>(null);

  // Orders state
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('all');
  const [ordersViewMode, setOrdersViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [isOrdersFilterOpen, setIsOrdersFilterOpen] = useState(false);
  const ordersFilterRef = useRef<HTMLButtonElement | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedOrderIds, setPinnedOrderIds] = useState<Set<string>>(() => new Set<string>());
  const [ordersSortBy, setOrdersSortBy] = useState<string>('orderNumber');
  const [ordersSortDir, setOrdersSortDir] = useState<'asc' | 'desc'>('desc');
  const [inspectedOrder, setInspectedOrder] = useState<PMPrintOrder | null>(null);
  const [orderOpenerEl, setOrderOpenerEl] = useState<HTMLElement | null>(null);

  // BAT state
  const [batSearch, setBatSearch] = useState('');
  const [batStatusFilter, setBatStatusFilter] = useState('all');
  const [batViewMode, setBatViewMode] = useState<'list' | 'grid' | 'calendar'>('grid');
  const [isBatFilterOpen, setIsBatFilterOpen] = useState(false);
  const batFilterRef = useRef<HTMLButtonElement | null>(null);
  const [selectedBatIds, setSelectedBatIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedBatIds, setPinnedBatIds] = useState<Set<string>>(() => new Set<string>());
  const [inspectedBat, setInspectedBat] = useState<PMBatDeliverable | null>(null);
  const [batOpenerEl, setBatOpenerEl] = useState<HTMLElement | null>(null);

  // Expenses state
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseViewMode, setExpenseViewMode] = useState<'list' | 'grid' | 'calendar'>('list');
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(() => new Set<string>());
  const [inspectedExpense, setInspectedExpense] = useState<PMExpense | null>(null);
  const [expenseOpenerEl, setExpenseOpenerEl] = useState<HTMLElement | null>(null);
  const [purchaseTitle, setPurchaseTitle] = useState('Nappe comptoir brandée');
  const [purchaseAmount, setPurchaseAmount] = useState('8400');
  const [purchaseCategory, setPurchaseCategory] = useState('materials');
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);

  const selectedProject: PMProject | undefined = useMemo(
    () => pmProjects.find((p) => p.id === selectedProjectId) || pmProjects[0],
    [pmProjects, selectedProjectId]
  );

  const projectExpenses = useMemo(
    () => pmExpenses.filter((e) => e.projectId === selectedProject?.id),
    [pmExpenses, selectedProject]
  );

  const filteredProjectExpenses = useMemo(() => {
    const q = expenseSearch.toLowerCase().trim();
    if (!q) return projectExpenses;
    return projectExpenses.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.declaredByUserName.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
  }, [projectExpenses, expenseSearch]);

  const totalExpensesSpent = useMemo(
    () => projectExpenses.reduce((acc, e) => acc + e.amountDzd, 0),
    [projectExpenses]
  );
  const fieldExpensesLimit = selectedProject?.maxFieldExpensesDzd || 1;
  const burnRatePercent = Math.min(Math.round((totalExpensesSpent / fieldExpensesLimit) * 100), 100);
  const isOverThreshold = burnRatePercent >= 85;
  const pendingBatCount = useMemo(
    () => pmBatDeliverables.filter((b) => b.approvalStatus === 'pending_review').length,
    [pmBatDeliverables]
  );

  const handleAddToCart = useCallback(
    (item: PMCollateralItem) => {
      setCartItems((prev) => {
        if (prev.find((i) => i.item.id === item.id)) {
          return prev.map((i) =>
            i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        return [...prev, { item, quantity: 1 }];
      });
      setIsCartOpen(true);
      showToast(
        isAr ? `تمت إضافة ${item.title} للسلة` : `${item.title} ajouté au panier print`,
        'info'
      );
    },
    [isAr]
  );

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((i) => (i.item.id === itemId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.item.id !== itemId));
  };

  const cartTotalDzd = cartItems.reduce((acc, i) => acc + i.item.unitCostDzd * i.quantity, 0);

  const handleTransmitToCrea = () => {
    if (cartItems.length === 0 || !selectedProject) return;
    const orderNumber = `CMD-PRINT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    addPmPrintOrder({
      tenantId: 'acc_01',
      facilityId: currentBranch?.id || 'branch_agency_main',
      projectId: selectedProject.id,
      projectTitle: selectedProject.title,
      orderNumber,
      items: cartItems.map((ci) => ({
        collateralItemId: ci.item.id,
        itemTitle: ci.item.title,
        quantity: ci.quantity,
        unitPriceDzd: ci.item.unitCostDzd,
      })),
      totalCostDzd: cartTotalDzd,
      status: 'sent_to_crea',
    });
    setCartItems([]);
    setIsCartOpen(false);
    setActiveTab('orders');
    showToast(
      isAr ? `تم إرسال الطلب ${orderNumber} للاستوديو` : `Commande ${orderNumber} transmise au Studio Créa`,
      'success'
    );
  };

  const handleApproveBat = useCallback(
    (batId: string) => {
      reviewPmBatDeliverable(batId, 'approved');
      showToast(
        isAr ? 'تم اعتماد ملف الطباعة BAT' : isEn ? 'BAT Proof approved' : 'Bon à Tirer validé',
        'success'
      );
    },
    [reviewPmBatDeliverable, isAr, isEn]
  );

  const handleRequestRevision = () => {
    if (activeBatId) {
      reviewPmBatDeliverable(activeBatId, 'revision_requested', correctionNote);
      setIsCorrectionModalOpen(false);
      setCorrectionNote('');
      setActiveBatId(null);
      showToast(
        isAr ? 'تم إرسال طلب التعديل للاستوديو' : isEn ? 'Revision sent to studio' : 'Demande de correction transmise',
        'info'
      );
    }
  };

  const handleDeclarePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseTitle || !purchaseAmount || !selectedProject) return;
    addPmExpense({
      tenantId: 'acc_01',
      facilityId: currentBranch?.id || 'branch_agency_main',
      projectId: selectedProject.id,
      projectTitle: selectedProject.title,
      declaredByUserId: 'stf_pm_01',
      declaredByUserName: 'K. Yacine (CDP)',
      declaredByRole: 'chef_projet',
      title: purchaseTitle,
      category: purchaseCategory as PMExpense['category'],
      amountDzd: Number(purchaseAmount),
      receiptPhotoUrl:
        'https://images.unsplash.com/photo-1554415707-9e49fe74a64c?w=500&auto=format&fit=crop&q=80',
      fiscalNif: '001916001234567',
      hasFiscalInvoice: true,
    });
    const msg = t('pm_cp_toast_purchase_desc', { title: purchaseTitle });
    setPurchaseSuccessMessage(msg);
    setTimeout(() => setPurchaseSuccessMessage(null), 3000);
    setPurchaseTitle('');
  };

  // Filtered lists
  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    return pmCollateralCatalog.filter((item) => {
      const matchQ =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q);
      const matchCat = catalogCategory === 'all' || item.category === catalogCategory;
      return matchQ && matchCat;
    });
  }, [pmCollateralCatalog, catalogSearch, catalogCategory]);

  const filteredOrders = useMemo(() => {
    const q = ordersSearch.toLowerCase().trim();
    return pmPrintOrders.filter((order) => {
      const matchQ =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        order.projectTitle.toLowerCase().includes(q) ||
        order.items.some((i) => i.itemTitle.toLowerCase().includes(q));
      const normalizedFilter =
        ordersStatusFilter === 'sent_to_printer'
          ? 'in_print'
          : ordersStatusFilter === 'printed'
          ? 'delivered'
          : ordersStatusFilter;
      const matchStatus =
        ordersStatusFilter === 'all' ||
        order.status === ordersStatusFilter ||
        order.status === normalizedFilter;
      return matchQ && matchStatus;
    });
  }, [pmPrintOrders, ordersSearch, ordersStatusFilter]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      const aPinned = pinnedOrderIds.has(a.id);
      const bPinned = pinnedOrderIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (ordersSortBy === 'orderNumber') {
        const cmp = a.orderNumber.localeCompare(b.orderNumber);
        return ordersSortDir === 'asc' ? cmp : -cmp;
      }
      if (ordersSortBy === 'totalCost') {
        return ordersSortDir === 'asc'
          ? a.totalCostDzd - b.totalCostDzd
          : b.totalCostDzd - a.totalCostDzd;
      }
      return 0;
    });
  }, [filteredOrders, pinnedOrderIds, ordersSortBy, ordersSortDir]);

  const filteredBats = useMemo(() => {
    const q = batSearch.toLowerCase().trim();
    return pmBatDeliverables
      .filter((b) => {
        const matchQ =
          !q ||
          b.title.toLowerCase().includes(q) ||
          b.projectTitle.toLowerCase().includes(q);
        const matchStatus = batStatusFilter === 'all' || b.approvalStatus === batStatusFilter;
        return matchQ && matchStatus;
      })
      .sort((a, b) => {
        const aP = pinnedBatIds.has(a.id);
        const bP = pinnedBatIds.has(b.id);
        if (aP && !bP) return -1;
        if (!aP && bP) return 1;
        return 0;
      });
  }, [pmBatDeliverables, batSearch, batStatusFilter, pinnedBatIds]);

  const activeOrder = useMemo(
    () => (inspectedOrder ? pmPrintOrders.find((o) => o.id === inspectedOrder.id) || inspectedOrder : null),
    [inspectedOrder, pmPrintOrders]
  );

  const activeBat = useMemo(
    () => (inspectedBat ? pmBatDeliverables.find((b) => b.id === inspectedBat.id) || inspectedBat : null),
    [inspectedBat, pmBatDeliverables]
  );

  const handleTogglePinOrder = useCallback((order: PMPrintOrder) => {
    setPinnedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(order.id)) next.delete(order.id);
      else next.add(order.id);
      return next;
    });
  }, []);

  const handleTogglePinBat = useCallback((bat: PMBatDeliverable) => {
    setPinnedBatIds((prev) => {
      const next = new Set(prev);
      if (next.has(bat.id)) next.delete(bat.id);
      else next.add(bat.id);
      return next;
    });
  }, []);

  const handleExportOrdersCsv = useCallback(() => {
    const headers = ['N° Commande', 'Projet', 'Nombre Articles', 'Montant Total DZD', 'Statut'];
    const rows = sortedOrders.map((o) => [
      o.orderNumber,
      o.projectTitle,
      o.items.reduce((acc, i) => acc + i.quantity, 0),
      o.totalCostDzd,
      o.status,
    ]);
    downloadCsvSafe(`commandes_print_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast(isAr ? 'تم تصدير طلبات الطباعة CSV' : 'Export CSV commandes généré', 'info');
  }, [sortedOrders, isAr]);

  // Kinetic Row Metadata
  const getCatalogRowMeta = useCallback(
    (item: PMCollateralItem): Partial<KineticRowData> => {
      const br = resolveRecordBranch(item, branchesById, currentBranch, language);
      return {
        title: item.title,
        subline: `${item.sku} · ${item.dimensions}`,
        avatarText: item.title.slice(0, 2).toUpperCase(),
        categoryLabel: item.category,
        statusLabel: item.isCustomizable
          ? isAr
            ? 'قابل للتخصيص'
            : isEn
            ? 'Custom Print'
            : 'Personnalisable'
          : isAr
          ? 'قياسي'
          : isEn
          ? 'Standard'
          : 'Standard',
        statusVariant: 'info',
        metricPrimary: formatMoney(item.unitCostDzd, 'DZD'),
        metricSecondary: item.material,
        branchName: br.name,
        branchCode: br.code,
        detailCol1: {
          heading: isAr ? 'المواصفات' : isEn ? 'Specifications' : 'Spécifications',
          primaryText: item.sku,
          secondaryText: item.dimensions,
        },
        detailCol2: {
          heading: isAr ? 'المادة' : isEn ? 'Material' : 'Support',
          primaryText: item.material,
          secondaryText: formatMoney(item.unitCostDzd, 'DZD'),
        },
        detailCol3: {
          heading: isAr ? 'التوافر والفرع' : isEn ? 'Availability' : 'Disponibilité',
          primaryText: item.isCustomizable ? (isAr ? 'حسب الطلب' : 'Sur mesure') : isAr ? 'متوفر' : 'Standard',
          secondaryText: br.name,
        },
      };
    },
    [branchesById, currentBranch, language, isAr, isEn]
  );

  const getOrderRowMeta = useCallback(
    (order: PMPrintOrder): Partial<KineticRowData> => {
      const br = resolveRecordBranch(order, branchesById, currentBranch, language);
      const badge = getOrderStatusBadge(order.status, language);
      const totalQty = order.items.reduce((acc, i) => acc + i.quantity, 0);
      return {
        title: order.orderNumber,
        subline: order.projectTitle,
        avatarText: 'PR',
        categoryLabel: `${order.items.length} réf. (${totalQty} u)`,
        statusLabel: badge.label,
        statusVariant: badge.variant,
        metricPrimary: formatMoney(order.totalCostDzd, 'DZD'),
        metricSecondary: order.createdAt.slice(0, 10),
        branchName: br.name,
        branchCode: br.code,
        isPinned: pinnedOrderIds.has(order.id),
        detailCol1: {
          heading: isAr ? 'بنود الطلبية' : isEn ? 'Order Items' : 'Articles POSM',
          primaryText: order.items[0] ? `${order.items[0].quantity}x ${order.items[0].itemTitle}` : '—',
          secondaryText: order.items[1] ? `${order.items[1].quantity}x ${order.items[1].itemTitle}` : undefined,
        },
        detailCol2: {
          heading: isAr ? 'المالية' : isEn ? 'Totals' : 'Valorisation',
          primaryText: formatMoney(order.totalCostDzd, 'DZD'),
          secondaryText: badge.label,
        },
        detailCol3: {
          heading: isAr ? 'المشروع والتاريخ' : isEn ? 'Project & Date' : 'Projet & Émission',
          primaryText: order.projectTitle,
          secondaryText: `${order.createdAt.slice(0, 10)} · ${br.name}`,
        },
      };
    },
    [branchesById, currentBranch, language, pinnedOrderIds, isAr, isEn]
  );

  const getBatRowMeta = useCallback(
    (bat: PMBatDeliverable): Partial<KineticRowData> => {
      const br = resolveRecordBranch(bat, branchesById, currentBranch, language);
      const badge = getBatStatusBadge(bat.approvalStatus, language);
      return {
        title: bat.title,
        subline: `${bat.projectTitle} · ${bat.versionCode}`,
        avatarText: bat.fileFormat.toUpperCase().slice(0, 2),
        categoryLabel: `${bat.colorSpace} · ${bat.resolutionDpi} DPI`,
        statusLabel: badge.label,
        statusVariant: badge.variant,
        metricPrimary: `${bat.resolutionDpi} DPI`,
        metricSecondary: `Bleed ${bat.bleedMm}mm`,
        branchName: br.name,
        branchCode: br.code,
        isPinned: pinnedBatIds.has(bat.id),
        detailCol1: {
          heading: isAr ? 'معايير الطباعة' : isEn ? 'Pre-press' : 'Prépresse',
          primaryText: `${bat.colorSpace} · ${bat.resolutionDpi} DPI`,
          secondaryText: `Fond perdu ${bat.bleedMm} mm`,
        },
        detailCol2: {
          heading: isAr ? 'المصمم' : isEn ? 'Designer' : 'Studio Créa',
          primaryText: bat.uploadedByCreativeName,
          secondaryText: bat.versionCode,
        },
        detailCol3: {
          heading: isAr ? 'الاعتماد والمشروع' : isEn ? 'Approval' : 'Validation BAT',
          primaryText: badge.label,
          secondaryText: `${bat.projectTitle} · ${br.name}`,
        },
      };
    },
    [branchesById, currentBranch, language, pinnedBatIds, isAr, isEn]
  );

  const getExpenseRowMeta = useCallback(
    (exp: PMExpense): Partial<KineticRowData> => {
      const br = resolveRecordBranch(exp, branchesById, currentBranch, language);
      const isApp = exp.status === 'approved_by_direction' || exp.status === 'audited_and_paid';
      const isRej = exp.status === 'rejected';
      return {
        title: exp.title,
        subline: `${exp.declaredByUserName} · ${exp.projectTitle}`,
        avatarText: exp.category.slice(0, 2).toUpperCase(),
        categoryLabel: exp.category,
        statusLabel: isApp
          ? isAr
            ? 'معتمد'
            : 'Validé'
          : isRej
          ? isAr
            ? 'مرفوض'
            : 'Rejeté'
          : isAr
          ? 'قيد الانتظار'
          : 'En attente',
        statusVariant: isApp ? 'active' : isRej ? 'blocked' : 'warning',
        metricPrimary: formatMoney(exp.amountDzd, 'DZD'),
        metricSecondary: exp.hasFiscalInvoice ? 'Facture NIF' : 'Reçu simple',
        branchName: br.name,
        branchCode: br.code,
        detailCol1: {
          heading: isAr ? 'المصرح والمشروع' : isEn ? 'Declarant & Project' : 'Déclarant & Projet',
          primaryText: exp.declaredByUserName,
          secondaryText: exp.projectTitle,
          tertiaryText: br.name,
        },
        detailCol2: {
          heading: isAr ? 'التصنيف والمستند' : isEn ? 'Category & Proof' : 'Nature & Justificatif',
          primaryText: exp.category,
          secondaryText: exp.hasFiscalInvoice ? 'Facture NIF' : 'Reçu simple',
        },
        detailCol3: {
          heading: isAr ? 'المبلغ والحالة' : isEn ? 'Amount & Status' : 'Montant & Statut',
          primaryText: formatMoney(exp.amountDzd, 'DZD'),
          secondaryText: isApp ? (isAr ? 'معتمد' : 'Validé') : isRej ? (isAr ? 'مرفوض' : 'Rejeté') : isAr ? 'قيد الانتظار' : 'En attente',
        },
      };
    },
    [branchesById, currentBranch, language, isAr]
  );

  // Columns
  const catalogColumns = useMemo<ColumnDefinition<PMCollateralItem>[]>(
    () => [
      {
        key: 'item',
        header: isAr ? 'الدعامة والمرجع POSM' : isEn ? 'Support & SKU' : 'Support & Réf. POSM',
        width: '2.5*',
        minWidth: '220px',
        renderCell: (item) => (
          <div className="flex items-center gap-3">
            <div
              data-sq="ctl"
              data-sq-border="solid"
              className="w-10 h-10 shrink-0 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626]"
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-black dark:text-white t-small truncate max-w-[200px]">
                {item.title}
              </div>
              <div className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                {item.sku} · {item.category}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'dimensions',
        header: isAr ? 'المقاسات والمواصفات' : isEn ? 'Specs' : 'Format & Spécifications',
        width: '1.5*',
        minWidth: '160px',
        renderCell: (item) => (
          <div className="t-cap text-black/70 dark:text-white/75 tabular-nums">{item.dimensions}</div>
        ),
      },
      {
        key: 'cost',
        header: isAr ? 'التكلفة الفردية' : isEn ? 'Unit Cost' : 'Coût Unitaire DZD',
        width: '1.2*',
        minWidth: '130px',
        align: 'right',
        renderCell: (item) => (
          <div className="tabular-nums t-small font-semibold text-black dark:text-white">
            {formatMoney(item.unitCostDzd, 'DZD')}
          </div>
        ),
      },
      {
        key: 'actions',
        header: isAr ? 'طلب' : isEn ? 'Order' : 'Commande',
        width: '1*',
        minWidth: '120px',
        align: 'right',
        renderCell: (item) => (
          <AtriumButton
            type="button"
            size="xs"
            variant="primary"
            icon={<ShoppingBag className="w-3.5 h-3.5" />}
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCart(item);
            }}
            className="ml-auto"
          >
            {isAr ? 'إضافة' : isEn ? 'Add' : 'Ajouter'}
          </AtriumButton>
        ),
      },
    ],
    [handleAddToCart, isAr, isEn]
  );

  const orderColumns = useMemo<ColumnDefinition<PMPrintOrder>[]>(
    () => [
      {
        key: 'orderNumber',
        header: isAr ? 'رقم طلب الطباعة' : isEn ? 'Print Order Ref.' : 'Réf. Bon de Commande',
        width: '2*',
        minWidth: '200px',
        sortable: true,
        renderCell: (order) => {
          const isPinned = pinnedOrderIds.has(order.id);
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={isPinned ? 'Unpin' : 'Pin'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePinOrder(order);
                }}
                data-sq="ctl-sm"
                className={`p-1 transition-colors cursor-pointer ${
                  isPinned
                    ? 'text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] bg-[#d4522f]/10'
                    : 'text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white/80'
                }`}
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
              </button>
              <div>
                <div className="tabular-nums font-semibold t-small text-black dark:text-white">
                  {order.orderNumber}
                </div>
                <div className="t-cap text-black/55 dark:text-white/55 truncate max-w-[170px]">
                  {order.projectTitle}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'items',
        header: isAr ? 'تفاصيل المواد POSM' : isEn ? 'POSM Articles' : 'Détails des Articles POSM',
        width: '2.5*',
        minWidth: '220px',
        renderCell: (order) => (
          <div className="t-cap text-black/70 dark:text-white/75 space-y-0.5">
            {order.items.slice(0, 2).map((it, idx) => (
              <div key={idx} className="truncate">
                • {it.quantity}x {it.itemTitle}
              </div>
            ))}
            {order.items.length > 2 && (
              <div className="t-cap text-black/55 dark:text-white/55 italic">
                + {order.items.length - 2} autre(s) référence(s)
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'totalCost',
        header: isAr ? 'إجمالي الطباعة' : isEn ? 'Total Print Cost' : 'Montant Impression',
        width: '1.5*',
        minWidth: '150px',
        sortable: true,
        align: 'right',
        renderCell: (order) => (
          <div className="tabular-nums font-semibold t-small text-black dark:text-white">
            {formatMoney(order.totalCostDzd, 'DZD')}
          </div>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'حالة الإنتاج' : isEn ? 'Status' : 'Statut Production',
        width: '1.5*',
        minWidth: '150px',
        align: 'center',
        renderCell: (order) => {
          const badge = getOrderStatusBadge(order.status, language);
          return (
            <span className={`inline-flex px-2.5 py-1 rounded-full t-small font-semibold ${badge.pillClass}`}>
              {badge.label}
            </span>
          );
        },
      },
    ],
    [pinnedOrderIds, handleTogglePinOrder, language, isAr, isEn]
  );

  const batColumns = useMemo<ColumnDefinition<PMBatDeliverable>[]>(
    () => [
      {
        key: 'title',
        header: isAr ? 'ملف الطباعة BAT' : isEn ? 'Artwork Proof' : 'Livrable BAT',
        width: '2.5*',
        minWidth: '220px',
        renderCell: (bat) => (
          <div className="flex items-center gap-3">
            <div
              data-sq="ctl-sm"
              data-sq-border="solid"
              className="w-10 h-10 shrink-0 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626]"
            >
              <img
                src={bat.previewUrl}
                alt={bat.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="font-semibold t-small text-black dark:text-white truncate">
                {bat.title}
              </div>
              <div className="t-cap text-black/55 dark:text-white/55 truncate">
                {bat.projectTitle} · {bat.versionCode}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'specs',
        header: isAr ? 'المواصفات الفنية' : isEn ? 'Pre-press' : 'Spécifications',
        width: '1.5*',
        minWidth: '150px',
        renderCell: (bat) => (
          <span className="tabular-nums t-cap text-black/70 dark:text-white/75">
            {bat.colorSpace} · {bat.resolutionDpi} DPI · {bat.bleedMm}mm
          </span>
        ),
      },
      {
        key: 'status',
        header: isAr ? 'الحالة' : isEn ? 'Status' : 'Statut',
        width: '1.3*',
        minWidth: '140px',
        renderCell: (bat) => {
          const badge = getBatStatusBadge(bat.approvalStatus, language);
          return (
            <span className={`inline-flex px-2.5 py-1 rounded-full t-small font-semibold ${badge.pillClass}`}>
              {badge.label}
            </span>
          );
        },
      },
    ],
    [language, isAr, isEn]
  );

  const expenseColumns = useMemo<ColumnDefinition<PMExpense>[]>(
    () => [
      {
        key: 'title',
        header: isAr ? 'البيان' : isEn ? 'Expense' : 'Désignation',
        width: '2.5*',
        minWidth: '200px',
        renderCell: (exp) => (
          <div className="min-w-0">
            <div className="font-semibold t-small text-black dark:text-white truncate">
              {exp.title}
            </div>
            <div className="t-cap text-black/55 dark:text-white/55 truncate">
              {exp.declaredByUserName} · {exp.category}
            </div>
          </div>
        ),
      },
      {
        key: 'amount',
        header: isAr ? 'المبلغ' : isEn ? 'Amount' : 'Montant DZD',
        width: '1.2*',
        minWidth: '130px',
        align: 'right',
        renderCell: (exp) => (
          <span className="tabular-nums t-small font-semibold text-black dark:text-white">
            {formatMoney(exp.amountDzd, 'DZD')}
          </span>
        ),
      },
      {
        key: 'receipt',
        header: isAr ? 'الوصل' : isEn ? 'Receipt' : 'Justificatif',
        width: '0.8*',
        minWidth: '90px',
        align: 'right',
        renderCell: (exp) =>
          exp.receiptPhotoUrl ? (
            <button
              type="button"
              aria-label="Voir le justificatif"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedReceiptUrl(exp.receiptPhotoUrl || null);
              }}
              className="p-2 text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white cursor-pointer ml-auto"
            >
              <Eye className="w-4 h-4" />
            </button>
          ) : null,
      },
    ],
    [isAr, isEn]
  );

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: pmProjects.length > 0 || pmPrintOrders.length > 0,
  });

  if (showSkeleton && ((pmProjects.length === 0 && pmPrintOrders.length === 0) || networkMode === 'force_skeleton')) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
        <OfflineRetryBanner
          isOffline={isOffline}
          isTimedOut={isTimedOut || isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync || retry}
        />
        <SkeletonCollectionScreen
          kpiCount={3}
          columns={[
            { width: '2.5*', minWidth: '180px' },
            { width: '2.5*', minWidth: '220px' },
            { width: '1.5*', minWidth: '150px' },
            { width: '1.5*', minWidth: '150px' },
          ]}
          viewMode="list"
          isOffline={isOffline}
          isTimedOut={isTimedOut || isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetry={retryCloudSync || retry}
        />
      </div>
    );
  }

  const cartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isRtl ? 'rtl' : 'ltr'}>
      <OfflineRetryBanner
        isOffline={isOffline}
        isTimedOut={isTimedOut || isSyncTimeout}
        lastSyncedAt={lastSyncedAt}
        onRetry={retryCloudSync || retry}
      />

      <ScreenHeaderBar
        icon={<FolderKanban size={22} />}
        title={
          activeTab === 'portfolio'
            ? isAr
              ? 'المشاريع'
              : isEn
              ? 'Projects'
              : 'Projets'
            : activeTab === 'catalog'
            ? isAr
              ? 'الكتالوج'
              : isEn
              ? 'Catalog'
              : 'Catalogue'
            : activeTab === 'orders'
            ? isAr
              ? 'الطلبات'
              : isEn
              ? 'Orders'
              : 'Commandes'
            : activeTab === 'bat'
            ? isAr
              ? 'المراجعات'
              : isEn
              ? 'Proofs'
              : 'Revue BAT'
            : isAr
            ? 'المشتريات'
            : isEn
            ? 'Purchases'
            : 'Achats'
        }
        primaryAction={{
          label: `${isAr ? 'سلة الطباعة' : isEn ? 'Print Cart' : 'Panier Print'}${
            cartCount > 0 ? ` (${cartCount})` : ''
          }`,
          icon: <ShoppingBag size={16} />,
          onClick: () => setIsCartOpen(true),
          dataAction: 'open-print-cart',
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'مؤشرات التنسيق الميداني والإنتاج الطباعي'
            : isEn
            ? 'Coordination & Print Production Metrics'
            : 'Indicateurs de Coordination & Production Print'
        }
        language={language}
        primaryCard={{
          label: isAr
            ? 'المشاريع الخاضعة للمتابعة'
            : isEn
            ? 'Supervised Projects'
            : 'Campagnes Supervisées',
          count: pmProjects.length,
          badgeText: `${pmProjects.length} ${isAr ? 'نشطة' : isEn ? 'active' : 'actives'}`,
          tone: 'emerald',
          isActive: activeTab === 'portfolio',
          onToggle: () => setActiveTab('portfolio'),
        }}
        secondaryCard={{
          label: isAr
            ? 'أوامر الطباعة ومراجعة BAT'
            : isEn
            ? 'Pending BAT & Print Orders'
            : 'BAT en Attente & Commandes',
          count: pendingBatCount,
          badgeText: `${pmPrintOrders.length} ${isAr ? 'أمر' : isEn ? 'orders' : 'ordres'}`,
          tone: 'terracotta',
          isActive: activeTab === 'bat',
          onToggle: () => setActiveTab('bat'),
        }}
        darkCard={{
          label: isAr
            ? 'المشتريات الميدانية المستهلكة'
            : isEn
            ? 'Field Expenses Consumed'
            : 'Dépenses Terrain Consommées',
          valueCount: totalExpensesSpent,
          formatValue: (v) => formatMoney(Math.round(v), 'DZD'),
          badgeCount: burnRatePercent,
          badgePrefix: '',
          badgeSuffix: `% ${isAr ? 'مستهلك' : isEn ? 'used' : 'consommé'}`,
          caption: isAr
            ? `سقف المشروع: ${formatMoney(fieldExpensesLimit, 'DZD')}`
            : isEn
            ? `Project Cap: ${formatMoney(fieldExpensesLimit, 'DZD')}`
            : `Plafond : ${formatMoney(fieldExpensesLimit, 'DZD')}`,
        }}
      />

      <ScreenPod>
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="t-label font-semibold text-black dark:text-white">
                {isAr
                  ? 'سير العمليات ومخطط الإنتاج والتنفيذ'
                  : isEn
                  ? 'Deployment Matrix & Operational Pipeline'
                  : 'Matrice de Déploiement & Pipeline Opérationnel'}
              </h2>
            </div>
            <LiveSegmentedControl
              size="sm"
              value={activeTab}
              onValueChange={(val) => setActiveTab(val)}
              options={[
                {
                  value: 'portfolio',
                  label: isAr ? 'المشاريع' : isEn ? 'Projects' : 'Pilotage',
                  tooltip: isAr ? 'متابعة المشاريع والتنفيذ' : isEn ? 'Portfolio oversight' : 'Pilotage du portefeuille',
                  count: pmProjects.length,
                },
                {
                  value: 'catalog',
                  label: isAr ? 'الكتالوج' : isEn ? 'Catalog' : 'Catalogue',
                  tooltip: isAr ? 'كتالوج POSM والدعائم' : isEn ? 'POSM & print catalog' : 'Catalogue POSM & PLV',
                  count: pmCollateralCatalog.length,
                },
                {
                  value: 'orders',
                  label: isAr ? 'الطباعة' : isEn ? 'Orders' : 'Commandes',
                  tooltip: isAr ? 'طلبات الطباعة' : isEn ? 'Print orders' : 'Commandes Print',
                  count: pmPrintOrders.length,
                },
                {
                  value: 'bat',
                  label: isAr ? 'الاعتماد' : isEn ? 'Proofs' : 'BAT',
                  tooltip: isAr ? 'مراجعة BAT' : isEn ? 'Artwork proofs review' : 'Revue BAT',
                  count: pmBatDeliverables.length,
                },
                {
                  value: 'expenses',
                  label: isAr ? 'المصاريف' : isEn ? 'Expenses' : 'Dépenses',
                  tooltip: isAr ? 'مصاريف المشروع' : isEn ? 'Project expenses' : 'Dépenses terrain',
                  count: pmExpenses.length,
                },
              ]}
              aria-label="Project Chef de Projet Stages Filter"
            />
          </div>

          {activeTab === 'portfolio' && (
            <div className="space-y-5">
              <div
                data-sq="card"
                data-sq-border="solid"
                className="p-5 bg-white dark:bg-neutral-900 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <span className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] block">
                    {isAr
                      ? 'مراقبة سقف المصاريف الميدانية'
                      : isEn
                      ? 'Field Expense Burn-Rate Control'
                      : 'Contrôle des Plafonds Dépenses Terrain'}
                  </span>
                  <h3 className="t-pod font-semibold text-black dark:text-white mt-0.5">
                    {selectedProject?.title}
                  </h3>
                  <div className="t-cap text-black/55 dark:text-white/55">
                    {isAr ? 'العميل:' : isEn ? 'Client:' : 'Client :'}{' '}
                    <span className="font-semibold text-black/70 dark:text-white/75">
                      {selectedProject?.clientName}
                    </span>{' '}
                    · {isAr ? 'السقف المعتمد:' : isEn ? 'Cap:' : 'Plafond autorisé :'}{' '}
                    <span className="tabular-nums font-semibold">
                      {formatMoney(selectedProject?.maxFieldExpensesDzd || 0, 'DZD')}
                    </span>
                  </div>
                </div>
                <div className="w-full sm:w-64 space-y-2">
                  <div className="flex justify-between t-small font-semibold">
                    <span className="text-black/55 dark:text-white/55">
                      {isAr ? 'المستهلك ميدانياً:' : isEn ? 'Consumed:' : 'Consommé Terrain :'}
                    </span>
                    <span
                      className={`tabular-nums ${
                        isOverThreshold ? 'text-red-600 font-semibold' : 'text-black dark:text-white'
                      }`}
                    >
                      {formatMoney(totalExpensesSpent, 'DZD')} ({burnRatePercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#F3EDE7] dark:bg-neutral-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isOverThreshold ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${burnRatePercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pmProjects.map((p) => {
                  const spent = pmExpenses
                    .filter((e) => e.projectId === p.id)
                    .reduce((acc, e) => acc + e.amountDzd, 0);
                  const limit = p.maxFieldExpensesDzd || 1;
                  const pct = Math.min(Math.round((spent / limit) * 100), 100);
                  const isSel = selectedProject?.id === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      data-sq="card"
                      data-sq-border="solid"
                      className={`p-5 text-left rtl:text-right transition-all cursor-pointer ${
                        isSel
                          ? '[--sq-stroke:#d4522f] bg-[#d4522f]/5 dark:bg-[#d4522f]/10'
                          : '[--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] bg-white dark:bg-neutral-900 hover:[--sq-stroke:#D5CBBF]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] truncate">
                          {p.clientName}
                        </span>
                        <span className="px-2 py-1 rounded-full t-small font-semibold bg-[#F3EDE7] dark:bg-neutral-800 text-black/70 dark:text-white/75">
                          {p.status}
                        </span>
                      </div>
                      <h4 className="t-label font-semibold text-black dark:text-white mb-2 truncate">
                        {p.title}
                      </h4>
                      <div className="space-y-1 t-cap text-black/55 dark:text-white/55">
                        <div className="flex justify-between">
                          <span>{isAr ? 'الميزانية الإجمالية:' : isEn ? 'Global Cap:' : 'Plafond Global:'}</span>
                          <span className="tabular-nums font-semibold text-black dark:text-white">
                            {formatMoney(p.budgetCapDzd, 'DZD')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{isAr ? 'مصاريف الميدان:' : isEn ? 'Field Spend:' : 'Dépenses Terrain:'}</span>
                          <span className="tabular-nums">
                            {formatMoney(spent, 'DZD')} / {formatMoney(limit, 'DZD')}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#F3EDE7] dark:bg-neutral-800 overflow-hidden mt-3">
                        <div
                          className={`h-full ${pct >= 85 ? 'bg-red-500' : 'bg-[#d4522f]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'catalog' && (
            <div className="space-y-4">
              <ScreenCollectionToolbar
                title={isAr ? 'كتالوج الدعائم والمواد POSM' : isEn ? 'POSM & Print Catalog' : 'Catalogue POSM & PLV'}
                liveRegionText={`${filteredCatalog.length} ${isAr ? 'دعامة' : isEn ? 'items' : 'supports'}`}
                language={language}
                searchQuery={catalogSearch}
                onSearchChange={setCatalogSearch}
                searchPlaceholder={
                  isAr ? 'بحث بالاسم أو SKU...' : isEn ? 'Search totem, rollup, stand...' : 'Rechercher totem, rollup, stand...'
                }
                statusOptions={[
                  { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: pmCollateralCatalog.length },
                  { value: 'stand', label: isAr ? 'منصات' : isEn ? 'Stands' : 'Stands' },
                  { value: 'pos_display', label: isAr ? 'حوامل' : isEn ? 'Displays' : 'PLV' },
                  { value: 'banner', label: isAr ? 'لافتات' : isEn ? 'Banners' : 'Bannières' },
                  { value: 'apparel', label: isAr ? 'ألبسة' : isEn ? 'Apparel' : 'Textiles' },
                ]}
                statusValue={catalogCategory}
                onStatusChange={setCatalogCategory}
                hasActiveAdvancedFilters={catalogCategory !== 'all'}
                activeFiltersCount={catalogCategory !== 'all' ? 1 : 0}
                isFilterModalOpen={isCatalogFilterOpen}
                filterButtonRef={catalogFilterRef}
                onToggleFilterModal={() => setIsCatalogFilterOpen((p) => !p)}
                viewMode={catalogViewMode}
                onViewModeChange={setCatalogViewMode}
                activeChips={
                  catalogCategory !== 'all'
                    ? [{ key: 'cat', label: catalogCategory, onRemove: () => setCatalogCategory('all') }]
                    : []
                }
                onResetAllFilters={() => {
                  setCatalogSearch('');
                  setCatalogCategory('all');
                }}
              />

              <UniversalDataCollection<PMCollateralItem>
                hideToolbar
                items={filteredCatalog}
                keyExtractor={(i) => i.id}
                viewMode={catalogViewMode === 'list' ? 'list' : 'grid'}
                defaultViewMode={catalogViewMode}
                columns={catalogColumns}
                openItemId={inspectedCatalog?.id || null}
                onItemClick={(item, el) => {
                  if (el) setCatalogOpenerEl(el);
                  setInspectedCatalog(item);
                }}
                onViewDetails={(item, el) => {
                  if (el) setCatalogOpenerEl(el);
                  setInspectedCatalog(item);
                }}
                getRowMeta={getCatalogRowMeta}
                getFanActions={(item): KineticRowFanAction[] => [
                  {
                    id: 'add-cart',
                    label: isAr ? 'أضف' : isEn ? 'Add' : 'Ajouter',
                    icon: <ShoppingBag size={14} />,
                    onClick: () => handleAddToCart(item),
                  },
                ]}
                getDetailActions={(item): KineticDetailAction[] => [
                  {
                    id: 'add-cart',
                    label: isAr ? 'إضافة للسلة' : isEn ? 'Add to Print Cart' : 'Ajouter au Panier',
                    icon: <ShoppingBag size={14} />,
                    onClick: () => handleAddToCart(item),
                  },
                ]}
                renderCard={(item) => (
                  <div className="flex flex-col justify-between h-full space-y-3">
                    <div className="space-y-2">
                      {item.imageUrl && (
                        <div
                          data-sq="ctl"
                          data-sq-border="solid"
                          className="w-full h-36 [--sq-stroke:rgba(230,222,214,0.6)] dark:[--sq-stroke:#262626]"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between t-cap text-black/55 dark:text-white/55 tabular-nums">
                        <span>{item.sku}</span>
                        <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] font-semibold">{item.category}</span>
                      </div>
                      <h3 className="t-label font-semibold text-black dark:text-white line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                        {item.dimensions}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-[#E6DED6]/60 dark:border-neutral-800 flex items-center justify-between">
                      <span className="tabular-nums font-semibold t-label text-black dark:text-white">
                        {formatMoney(item.unitCostDzd, 'DZD')}
                      </span>
                      <AtriumButton
                        type="button"
                        size="xs"
                        variant="primary"
                        icon={<Plus className="w-3.5 h-3.5" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(item);
                        }}
                      >
                        {isAr ? 'طلب' : isEn ? 'Order' : 'Commander'}
                      </AtriumButton>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <ScreenCollectionToolbar
                title={isAr ? 'سجل أوامر الطباعة' : isEn ? 'Print Orders Registry' : 'Registre Commandes Print'}
                liveRegionText={`${sortedOrders.length} ${isAr ? 'طلبية' : isEn ? 'orders' : 'commandes'}`}
                language={language}
                searchQuery={ordersSearch}
                onSearchChange={setOrdersSearch}
                searchPlaceholder={
                  isAr ? 'بحث برقم الطلب أو الحملة...' : isEn ? 'Search order #, campaign...' : 'Rechercher par n° de bon ou campagne...'
                }
                statusOptions={[
                  { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: pmPrintOrders.length },
                  { value: 'sent_to_crea', label: isAr ? 'التصميم' : isEn ? 'Studio' : 'Créa' },
                  { value: 'bat_in_progress', label: isAr ? 'مراجعة BAT' : isEn ? 'Proofing' : 'BAT' },
                  { value: 'in_print', label: isAr ? 'المطبعة' : isEn ? 'Printer' : 'Imprimeur' },
                  { value: 'delivered', label: isAr ? 'مُسلّم' : isEn ? 'Delivered' : 'Livré' },
                ]}
                statusValue={ordersStatusFilter}
                onStatusChange={setOrdersStatusFilter}
                hasActiveAdvancedFilters={ordersStatusFilter !== 'all'}
                activeFiltersCount={ordersStatusFilter !== 'all' ? 1 : 0}
                isFilterModalOpen={isOrdersFilterOpen}
                filterButtonRef={ordersFilterRef}
                onToggleFilterModal={() => setIsOrdersFilterOpen((p) => !p)}
                viewMode={ordersViewMode}
                onViewModeChange={setOrdersViewMode}
                onExport={handleExportOrdersCsv}
                activeChips={
                  ordersStatusFilter !== 'all'
                    ? [
                        {
                          key: 'status',
                          label: getOrderStatusBadge(ordersStatusFilter, language).label,
                          onRemove: () => setOrdersStatusFilter('all'),
                        },
                      ]
                    : []
                }
                onResetAllFilters={() => {
                  setOrdersSearch('');
                  setOrdersStatusFilter('all');
                }}
              />

              <UniversalDataCollection<PMPrintOrder>
                hideToolbar
                items={sortedOrders}
                keyExtractor={(o) => o.id}
                viewMode={ordersViewMode === 'grid' ? 'grid' : 'list'}
                defaultViewMode={ordersViewMode}
                columns={orderColumns}
                sortBy={ordersSortBy}
                sortDirection={ordersSortDir}
                onSortChange={(key, dir) => {
                  setOrdersSortBy(key);
                  setOrdersSortDir(dir);
                }}
                selectedIds={selectedOrderIds}
                onSelectionChange={setSelectedOrderIds}
                isPinned={(o) => pinnedOrderIds.has(o.id)}
                onTogglePin={handleTogglePinOrder}
                openItemId={activeOrder?.id || null}
                onItemClick={(order, el) => {
                  if (el) setOrderOpenerEl(el);
                  setInspectedOrder(order);
                }}
                onViewDetails={(order, el) => {
                  if (el) setOrderOpenerEl(el);
                  setInspectedOrder(order);
                }}
                bulkSecondaryAction={{
                  label: isAr ? 'تحديد كمُسلم' : isEn ? 'Mark Delivered' : 'Marquer Livré',
                  icon: <Truck size={14} />,
                  onClick: () => {
                    batchUpdatePmPrintOrderStatus(Array.from(selectedOrderIds), 'delivered');
                    setSelectedOrderIds(new Set<string>());
                  },
                }}
                onBulkDelete={(ids) => {
                  batchDeletePmPrintOrders(Array.from(ids));
                  setSelectedOrderIds(new Set<string>());
                }}
                getRowMeta={getOrderRowMeta}
                getFanActions={(order): KineticRowFanAction[] => [
                  {
                    id: 'print',
                    label: isAr ? 'للمطبعة' : isEn ? 'To Print' : 'Imprimeur',
                    icon: <Printer size={14} />,
                    onClick: () => batchUpdatePmPrintOrderStatus([order.id], 'in_print'),
                  },
                  {
                    id: 'deliver',
                    label: isAr ? 'مُسلّم' : isEn ? 'Delivered' : 'Livré',
                    icon: <CheckCircle size={14} />,
                    onClick: () => batchUpdatePmPrintOrderStatus([order.id], 'delivered'),
                  },
                ]}
                getDetailActions={(order): KineticDetailAction[] => [
                  {
                    id: 'print',
                    label: isAr ? 'إرسال للمطبعة' : isEn ? 'Send to Printer' : 'Envoyer Imprimeur',
                    icon: <Printer size={14} />,
                    onClick: () => batchUpdatePmPrintOrderStatus([order.id], 'in_print'),
                  },
                  {
                    id: 'deliver',
                    label: isAr ? 'تأكيد الاستلام' : isEn ? 'Mark Delivered' : 'Marquer Livré',
                    icon: <CheckCircle size={14} />,
                    onClick: () => batchUpdatePmPrintOrderStatus([order.id], 'delivered'),
                  },
                ]}
                renderCard={(order) => (
                  <div className="flex flex-col justify-between h-full space-y-3">
                    <div>
                      <div className="flex items-center justify-between t-small tabular-nums font-semibold text-black dark:text-white mb-1">
                        <span>{order.orderNumber}</span>
                        <span className="text-black/55 dark:text-white/55 font-normal">
                          {getOrderStatusBadge(order.status, language).label}
                        </span>
                      </div>
                      <h4 className="t-label font-semibold text-black dark:text-white">
                        {order.projectTitle}
                      </h4>
                      <div className="t-cap text-black/55 dark:text-white/55 mt-2 space-y-1">
                        {order.items.map((it, idx) => (
                          <div key={idx}>
                            • {it.quantity}x {it.itemTitle}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-[#E6DED6]/60 dark:border-neutral-800 flex justify-between items-center t-cap">
                      <span className="text-black/55 dark:text-white/55">Total :</span>
                      <span className="tabular-nums font-semibold text-black dark:text-white">
                        {formatMoney(order.totalCostDzd, 'DZD')}
                      </span>
                    </div>
                  </div>
                )}
              />
            </div>
          )}

          {activeTab === 'bat' && (
            <div className="space-y-4">
              <ScreenCollectionToolbar
                title={isAr ? 'مراجعة ملفات BAT' : isEn ? 'Artwork Proofing (BAT)' : 'Revue & Validation BAT'}
                liveRegionText={`${filteredBats.length} BAT`}
                language={language}
                searchQuery={batSearch}
                onSearchChange={setBatSearch}
                searchPlaceholder={
                  isAr ? 'بحث في ملفات BAT...' : isEn ? 'Search deliverable or campaign...' : 'Rechercher par livrable ou campagne...'
                }
                statusOptions={[
                  { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: pmBatDeliverables.length },
                  {
                    value: 'pending_review',
                    label: isAr ? 'قيد المراجعة' : isEn ? 'Pending' : 'En Attente',
                    count: pendingBatCount,
                  },
                  {
                    value: 'approved',
                    label: isAr ? 'معتمد' : isEn ? 'Approved' : 'Validés',
                    count: pmBatDeliverables.filter((b) => b.approvalStatus === 'approved').length,
                  },
                  {
                    value: 'revision_requested',
                    label: isAr ? 'مُعدّل' : isEn ? 'Revisions' : 'Corrections',
                  },
                ]}
                statusValue={batStatusFilter}
                onStatusChange={setBatStatusFilter}
                hasActiveAdvancedFilters={batStatusFilter !== 'all'}
                activeFiltersCount={batStatusFilter !== 'all' ? 1 : 0}
                isFilterModalOpen={isBatFilterOpen}
                filterButtonRef={batFilterRef}
                onToggleFilterModal={() => setIsBatFilterOpen((p) => !p)}
                viewMode={batViewMode}
                onViewModeChange={setBatViewMode}
                activeChips={
                  batStatusFilter !== 'all'
                    ? [
                        {
                          key: 'batStatus',
                          label: getBatStatusBadge(
                            batStatusFilter as PMBatDeliverable['approvalStatus'],
                            language
                          ).label,
                          onRemove: () => setBatStatusFilter('all'),
                        },
                      ]
                    : []
                }
                onResetAllFilters={() => {
                  setBatSearch('');
                  setBatStatusFilter('all');
                }}
              />

              <UniversalDataCollection<PMBatDeliverable>
                hideToolbar
                items={filteredBats}
                keyExtractor={(b) => b.id}
                viewMode={batViewMode === 'list' ? 'list' : 'grid'}
                defaultViewMode={batViewMode}
                columns={batColumns}
                selectedIds={selectedBatIds}
                onSelectionChange={setSelectedBatIds}
                isPinned={(b) => pinnedBatIds.has(b.id)}
                onTogglePin={handleTogglePinBat}
                openItemId={activeBat?.id || null}
                onItemClick={(bat, el) => {
                  if (el) setBatOpenerEl(el);
                  setInspectedBat(bat);
                }}
                onViewDetails={(bat, el) => {
                  if (el) setBatOpenerEl(el);
                  setInspectedBat(bat);
                }}
                bulkSecondaryAction={{
                  label: isAr ? 'اعتماد BAT' : isEn ? 'Approve BAT' : 'Valider BAT',
                  icon: <FileCheck2 size={14} />,
                  onClick: () => {
                    batchReviewPmBatDeliverables(Array.from(selectedBatIds), 'approved');
                    setSelectedBatIds(new Set<string>());
                  },
                }}
                onBulkDelete={(ids) => {
                  batchDeletePmBatDeliverables(Array.from(ids));
                  setSelectedBatIds(new Set<string>());
                }}
                getRowMeta={getBatRowMeta}
                getFanActions={(bat): KineticRowFanAction[] => [
                  {
                    id: 'approve',
                    label: isAr ? 'اعتماد' : isEn ? 'Approve' : 'Valider',
                    icon: <CheckCircle size={14} />,
                    onClick: () => handleApproveBat(bat.id),
                  },
                  {
                    id: 'revise',
                    label: isAr ? 'تعديل' : isEn ? 'Revise' : 'Révision',
                    icon: <MessageSquare size={14} />,
                    onClick: () => {
                      setActiveBatId(bat.id);
                      setIsCorrectionModalOpen(true);
                    },
                  },
                ]}
                getDetailActions={(bat): KineticDetailAction[] => [
                  {
                    id: 'approve',
                    label: isAr ? 'اعتماد BAT' : isEn ? 'Approve BAT' : 'Valider BAT',
                    icon: <CheckCircle size={14} />,
                    onClick: () => handleApproveBat(bat.id),
                  },
                  {
                    id: 'revise',
                    label: isAr ? 'طلب تصحيح' : isEn ? 'Request Revision' : 'Demander Révision',
                    icon: <MessageSquare size={14} />,
                    onClick: () => {
                      setActiveBatId(bat.id);
                      setIsCorrectionModalOpen(true);
                    },
                  },
                ]}
                renderCard={(bat) => {
                  const badge = getBatStatusBadge(bat.approvalStatus, language);
                  return (
                    <div className="space-y-3">
                      <div
                        data-sq="ctl"
                        data-sq-border="solid"
                        className="w-full h-44 [--sq-stroke:rgba(230,222,214,0.6)] dark:[--sq-stroke:#262626]"
                      >
                        <img
                          src={bat.previewUrl}
                          alt={bat.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] truncate">
                          {bat.projectTitle}
                        </span>
                        <span className={`px-2 py-1 rounded-full t-small font-semibold ${badge.pillClass}`}>
                          {badge.label}
                        </span>
                      </div>
                      <h3 className="t-label font-semibold text-black dark:text-white truncate">
                        {bat.title}
                      </h3>
                      <div className="flex items-center gap-2 t-cap text-black/55 dark:text-white/55 tabular-nums">
                        <span>{bat.colorSpace}</span>
                        <span>·</span>
                        <span>{bat.resolutionDpi} DPI</span>
                        <span>·</span>
                        <span>{bat.bleedMm}mm</span>
                      </div>
                      {bat.revisionComments && (
                        <div
                          data-sq="ctl"
                          className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 t-cap"
                        >
                          Note CDP : {bat.revisionComments}
                        </div>
                      )}
                      <div className="pt-2 border-t border-[#E6DED6]/60 dark:border-neutral-800 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveBatId(bat.id);
                            setIsCorrectionModalOpen(true);
                          }}
                          data-sq="ctl"
                          data-sq-border="solid"
                          className="px-3 py-2 t-small font-semibold text-black/70 dark:text-white/75 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#404040] hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                        >
                          {isAr ? 'طلب تعديل' : isEn ? 'Revision' : 'Demander Révision'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveBat(bat.id);
                          }}
                          data-sq="ctl"
                          className="px-3 py-2 t-small font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors cursor-pointer"
                        >
                          {isAr ? 'اعتماد BAT' : isEn ? 'Approve' : 'Valider BAT'}
                        </button>
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <ScreenCollectionToolbar
                  title={isAr ? 'مصاريف الحملة الميدانية' : isEn ? 'Project Field Expenses' : 'Dépenses Terrain Projet'}
                  liveRegionText={`${filteredProjectExpenses.length} ${isAr ? 'مصاريف' : isEn ? 'expenses' : 'dépenses'}`}
                  language={language}
                  searchQuery={expenseSearch}
                  onSearchChange={setExpenseSearch}
                  searchPlaceholder={
                    isAr ? 'بحث بالعنوان أو المصرح...' : isEn ? 'Search expense title...' : 'Rechercher par titre de dépense...'
                  }
                  viewMode={expenseViewMode}
                  onViewModeChange={setExpenseViewMode}
                />
                <UniversalDataCollection<PMExpense>
                  hideToolbar
                  items={filteredProjectExpenses}
                  keyExtractor={(e) => e.id}
                  viewMode={expenseViewMode === 'grid' ? 'grid' : 'list'}
                  defaultViewMode={expenseViewMode}
                  columns={expenseColumns}
                  selectedIds={selectedExpenseIds}
                  onSelectionChange={setSelectedExpenseIds}
                  onBulkDelete={(ids) => {
                    batchDeletePmExpenses(Array.from(ids));
                    setSelectedExpenseIds(new Set<string>());
                  }}
                  openItemId={inspectedExpense?.id || null}
                  onItemClick={(exp, el) => {
                    if (el) setExpenseOpenerEl(el);
                    setInspectedExpense(exp);
                  }}
                  getRowMeta={getExpenseRowMeta}
                  getFanActions={(exp): KineticRowFanAction[] =>
                    exp.receiptPhotoUrl
                      ? [
                          {
                            id: 'receipt',
                            label: isAr ? 'الوصل' : isEn ? 'Receipt' : 'Reçu',
                            icon: <Eye size={14} />,
                            onClick: () => setSelectedReceiptUrl(exp.receiptPhotoUrl || null),
                          },
                        ]
                      : []
                  }
                  getDetailActions={(exp): KineticDetailAction[] => [
                    {
                      id: 'inspect',
                      label: isAr ? 'تفاصيل' : isEn ? 'Details' : 'Détails',
                      icon: <Eye size={14} />,
                      onClick: () => setInspectedExpense(exp),
                    },
                    ...(exp.receiptPhotoUrl
                      ? [
                          {
                            id: 'receipt',
                            label: isAr ? 'الوصل' : isEn ? 'Receipt' : 'Reçu',
                            icon: <Eye size={14} />,
                            onClick: () => setSelectedReceiptUrl(exp.receiptPhotoUrl || null),
                          },
                        ]
                      : []),
                  ]}
                  renderCard={(exp) => (
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded-[var(--r-check,6px)] t-small font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            {exp.category}
                          </span>
                          <span className="font-semibold t-small text-black dark:text-white truncate">
                            {exp.title}
                          </span>
                        </div>
                        <div className="t-cap text-black/55 dark:text-white/55">
                          {exp.declaredByUserName} · {exp.status}
                        </div>
                      </div>
                      <span className="tabular-nums font-semibold t-label text-black dark:text-white shrink-0">
                        {formatMoney(exp.amountDzd, 'DZD')}
                      </span>
                    </div>
                  )}
                />
              </div>

              <div
                data-sq="card"
                data-sq-border="solid"
                className="lg:col-span-5 p-6 bg-white dark:bg-neutral-900 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] space-y-4 self-start"
              >
                <div>
                  <span className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] block">
                    {isAr ? 'التصريح بمشتريات الميدان' : isEn ? 'Field Purchase Declaration' : "Déclaration d'Achat Terrain"}
                  </span>
                  <h3 className="t-card font-semibold text-black dark:text-white mt-0.5">
                    {isAr ? 'إدخال فوري وترميز المخزون' : isEn ? 'Quick Entry & Asset Coding' : 'Saisie Immédiate & Codage Stock'}
                  </h3>
                  <p className="t-cap text-black/55 dark:text-white/55">
                    {isAr
                      ? 'ينشئ تلقائياً مرجع أصل للوكالة عند المصادقة.'
                      : isEn
                      ? 'Automatically tracks indirect agency asset coding.'
                      : "Génère automatiquement une référence d'immobilisation indirecte pour l'agence."}
                  </p>
                </div>
                {purchaseSuccessMessage && (
                  <div
                    data-sq="ctl"
                    data-sq-border="solid"
                    className="p-3 bg-emerald-50 dark:bg-emerald-950/40 [--sq-stroke:#a7f3d0] dark:[--sq-stroke:#065f46] t-cap text-emerald-800 dark:text-emerald-300"
                  >
                    {purchaseSuccessMessage}
                  </div>
                )}
                <form onSubmit={handleDeclarePurchase} className="space-y-4">
                  <LabelInput
                    field="PurchaseTitle"
                    label={isAr ? 'بيان المشتريات' : isEn ? 'Item Description' : 'Désignation du Matériel'}
                    value={purchaseTitle}
                    onChange={setPurchaseTitle}
                    required
                    height={44}
                    corner={12}
                  />
                  <LabelInput
                    field="PurchaseAmount"
                    label={isAr ? 'المبلغ (دج)' : isEn ? 'Amount TTC (DZD)' : 'Montant TTC (DZD)'}
                    type="number"
                    value={purchaseAmount}
                    onChange={setPurchaseAmount}
                    required
                    height={44}
                    corner={12}
                  />
                  <FilterSelect
                    label={isAr ? 'طبيعة الشراء' : isEn ? 'Category' : "Nature de l'Achat"}
                    value={purchaseCategory}
                    onChange={(val) =>
                      setPurchaseCategory(typeof val === 'string' ? val : val.target?.value || String(val))
                    }
                    options={[
                      {
                        value: 'materials',
                        label: isAr ? 'معدات' : isEn ? 'Equipment' : 'Matériel',
                        tooltip: isAr ? 'معدات وأثاث المنصة' : 'Matériel & Mobilier Stand',
                      },
                      {
                        value: 'catering',
                        label: isAr ? 'إطعام' : isEn ? 'Catering' : 'Restauration',
                        tooltip: isAr ? 'إطعام المنشطين' : 'Restauration Animateurs',
                      },
                      {
                        value: 'transport',
                        label: isAr ? 'نقل' : isEn ? 'Transport' : 'Transport',
                        tooltip: isAr ? 'وقود ونقل' : 'Carburant & Transport',
                      },
                    ]}
                  />
                  <AtriumButton
                    type="submit"
                    variant="primary"
                    className="w-full"
                    icon={<Plus className="w-4 h-4" />}
                  >
                    {isAr ? 'تصريح وتحميل على المشروع' : isEn ? 'Submit to Project' : 'Déclarer & Imputer au Projet'}
                  </AtriumButton>
                </form>
              </div>
            </div>
          )}
        </div>
      </ScreenPod>

      {/* Filter Modals */}
      <KineticFilterModal
        isOpen={isCatalogFilterOpen}
        onClose={() => setIsCatalogFilterOpen(false)}
        triggerRef={catalogFilterRef}
        language={language}
        displayCount={filteredCatalog.length}
        entityPluralLabel={isAr ? 'دعامات' : isEn ? 'items' : 'supports'}
        hasActiveFilters={catalogCategory !== 'all'}
        onResetFilters={() => {
          setCatalogSearch('');
          setCatalogCategory('all');
        }}
        sections={[
          {
            id: 'category',
            kind: 'segmented',
            label: isAr ? 'الفئة' : isEn ? 'Category' : 'Catégorie POSM',
            value: catalogCategory,
            onChange: setCatalogCategory,
            options: [
              { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Toutes', count: pmCollateralCatalog.length },
              { value: 'stand', label: 'Stands' },
              { value: 'pos_display', label: 'PLV / Totems' },
              { value: 'banner', label: 'Bannières' },
              { value: 'apparel', label: 'Textiles' },
            ],
          },
        ]}
      />

      <KineticFilterModal
        isOpen={isOrdersFilterOpen}
        onClose={() => setIsOrdersFilterOpen(false)}
        triggerRef={ordersFilterRef}
        language={language}
        displayCount={sortedOrders.length}
        entityPluralLabel={isAr ? 'طلبات' : isEn ? 'orders' : 'commandes'}
        hasActiveFilters={ordersStatusFilter !== 'all'}
        onResetFilters={() => {
          setOrdersSearch('');
          setOrdersStatusFilter('all');
        }}
        sections={[
          {
            id: 'orderStatus',
            kind: 'segmented',
            label: isAr ? 'حالة الطباعة' : isEn ? 'Production Status' : 'Statut Production',
            value: ordersStatusFilter,
            onChange: setOrdersStatusFilter,
            options: [
              { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: pmPrintOrders.length },
              { value: 'sent_to_crea', label: 'Transmis Créa' },
              { value: 'bat_in_progress', label: 'BAT en cours' },
              { value: 'in_print', label: "Chez l'Imprimeur" },
              { value: 'delivered', label: 'Livré' },
            ],
          },
        ]}
      />

      <KineticFilterModal
        isOpen={isBatFilterOpen}
        onClose={() => setIsBatFilterOpen(false)}
        triggerRef={batFilterRef}
        language={language}
        displayCount={filteredBats.length}
        entityPluralLabel="BAT"
        hasActiveFilters={batStatusFilter !== 'all'}
        onResetFilters={() => {
          setBatSearch('');
          setBatStatusFilter('all');
        }}
        sections={[
          {
            id: 'batStatus',
            kind: 'segmented',
            label: isAr ? 'حالة المراجعة' : isEn ? 'Review Status' : 'Statut Validation',
            value: batStatusFilter,
            onChange: setBatStatusFilter,
            options: [
              { value: 'all', label: isAr ? 'الكل' : isEn ? 'All' : 'Tous', count: pmBatDeliverables.length },
              { value: 'pending_review', label: 'En Attente' },
              { value: 'approved', label: 'Validés' },
              { value: 'revision_requested', label: 'Corrections' },
            ],
          },
        ]}
      />

      {/* Inspectors */}
      <KineticSlideOverInspector<PMCollateralItem>
        isOpen={Boolean(inspectedCatalog)}
        item={inspectedCatalog}
        allItems={filteredCatalog}
        keyExtractor={(i) => i.id}
        openerElement={catalogOpenerEl}
        language={language}
        title={inspectedCatalog?.title || ''}
        subtitle={`${inspectedCatalog?.sku || ''} · ${inspectedCatalog?.dimensions || ''}`}
        categoryLabel={inspectedCatalog?.category}
        avatarText={(inspectedCatalog?.title || 'PM').slice(0, 2).toUpperCase()}
        onClose={() => setInspectedCatalog(null)}
        onSelectItem={(item) => setInspectedCatalog(item)}
        renderBody={(item) => (
          <>
            {item.imageUrl && (
              <InspectorSection index={0}>
                <div
                  data-sq="card"
                  data-sq-border="solid"
                  className="w-full h-48 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626]"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </InspectorSection>
            )}
            <InspectorSection index={1}>
              <InspectorBigStat
                value={formatMoney(item.unitCostDzd, 'DZD')}
                tone="accent"
                caption={`${item.material} · ${item.dimensions}`}
              />
            </InspectorSection>
            <InspectorSection index={2} title={isAr ? 'المواصفات الفنية' : 'Fiche Technique POSM'}>
              <InspectorCard>
                <InspectorKeyValue label="SKU" value={item.sku} />
                <InspectorKeyValue label="Catégorie" value={item.category} mono={false} />
                <InspectorKeyValue label="Dimensions" value={item.dimensions} />
                <InspectorKeyValue label="Matière" value={item.material} mono={false} isLast />
              </InspectorCard>
            </InspectorSection>
            <InspectorSection index={3}>
              <InspectorWideButton
                label={isAr ? '+ إضافة إلى سلة الطباعة' : '+ Ajouter au Bon de Commande Print'}
                onClick={() => handleAddToCart(item)}
              />
            </InspectorSection>
          </>
        )}
      />

      <KineticSlideOverInspector<PMPrintOrder>
        isOpen={Boolean(activeOrder)}
        item={activeOrder}
        allItems={sortedOrders}
        keyExtractor={(o) => o.id}
        openerElement={orderOpenerEl}
        language={language}
        title={activeOrder?.orderNumber || ''}
        subtitle={activeOrder?.projectTitle}
        categoryLabel={`${activeOrder?.items.length || 0} réf. POSM`}
        avatarText="PR"
        statusLabel={activeOrder ? getOrderStatusBadge(activeOrder.status, language).label : undefined}
        statusClassName={activeOrder ? getOrderStatusBadge(activeOrder.status, language).pillClass : undefined}
        onClose={() => setInspectedOrder(null)}
        onSelectItem={(o) => setInspectedOrder(o)}
        onDelete={(o) => {
          batchDeletePmPrintOrders([o.id]);
          setInspectedOrder(null);
        }}
        holdToDelete
        renderBody={(order) => (
          <>
            <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : 'Actions rapides'}>
              <InspectorQuickActions
                actions={[
                  {
                    id: 'print',
                    label: isAr ? 'للمطبعة' : 'Imprimeur',
                    icon: <Printer className="w-[18px] h-[18px]" />,
                    primary: true,
                    onClick: () => batchUpdatePmPrintOrderStatus([order.id], 'in_print'),
                  },
                  {
                    id: 'deliver',
                    label: isAr ? 'تم التسليم' : 'Livré',
                    icon: <CheckCircle className="w-[18px] h-[18px]" />,
                    onClick: () => batchUpdatePmPrintOrderStatus([order.id], 'delivered'),
                  },
                  {
                    id: 'pin',
                    label: pinnedOrderIds.has(order.id) ? 'Désépingler' : 'Épingler',
                    icon: <Pin className="w-[18px] h-[18px]" />,
                    onClick: () => handleTogglePinOrder(order),
                  },
                ]}
              />
            </InspectorSection>
            <InspectorSection index={1}>
              <InspectorBigStat
                value={formatMoney(order.totalCostDzd, 'DZD')}
                tone="accent"
                caption={`${order.items.reduce((a, i) => a + i.quantity, 0)} unité(s) · ${order.projectTitle}`}
              />
            </InspectorSection>
            <InspectorSection index={2} title={isAr ? 'تفاصيل المواد' : `Articles commandés (${order.items.length})`}>
              <InspectorCard>
                {order.items.map((it, idx) => (
                  <InspectorListItem
                    key={`${it.collateralItemId}-${idx}`}
                    title={it.itemTitle}
                    subtitle={`${it.quantity} × ${formatMoney(it.unitPriceDzd, 'DZD')}`}
                    metaRight={formatMoney(it.quantity * it.unitPriceDzd, 'DZD')}
                    isLast={idx === order.items.length - 1}
                  />
                ))}
              </InspectorCard>
            </InspectorSection>
          </>
        )}
      />

      <KineticSlideOverInspector<PMBatDeliverable>
        isOpen={Boolean(activeBat)}
        item={activeBat}
        allItems={filteredBats}
        keyExtractor={(b) => b.id}
        openerElement={batOpenerEl}
        language={language}
        title={activeBat?.title || ''}
        subtitle={`${activeBat?.projectTitle || ''} · ${activeBat?.versionCode || ''}`}
        categoryLabel={activeBat ? `${activeBat.colorSpace} · ${activeBat.resolutionDpi} DPI` : undefined}
        avatarText={activeBat?.fileFormat.toUpperCase().slice(0, 2) || 'BT'}
        statusLabel={activeBat ? getBatStatusBadge(activeBat.approvalStatus, language).label : undefined}
        statusClassName={activeBat ? getBatStatusBadge(activeBat.approvalStatus, language).pillClass : undefined}
        onClose={() => setInspectedBat(null)}
        onSelectItem={(b) => setInspectedBat(b)}
        onDelete={(b) => {
          batchDeletePmBatDeliverables([b.id]);
          setInspectedBat(null);
        }}
        holdToDelete
        renderBody={(bat) => (
          <>
            <InspectorSection index={0}>
              <div
                data-sq="card"
                data-sq-border="solid"
                className="w-full h-48 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626]"
              >
                <img
                  src={bat.previewUrl}
                  alt={bat.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </InspectorSection>
            <InspectorSection index={1} title={isAr ? 'إجراءات الاعتماد' : 'Contrôle Qualité BAT'}>
              <InspectorQuickActions
                actions={[
                  {
                    id: 'approve',
                    label: isAr ? 'اعتماد' : 'Valider BAT',
                    icon: <CheckCircle className="w-[18px] h-[18px]" />,
                    primary: true,
                    onClick: () => handleApproveBat(bat.id),
                  },
                  {
                    id: 'revision',
                    label: isAr ? 'تصحيح' : 'Corrections',
                    icon: <MessageSquare className="w-[18px] h-[18px]" />,
                    onClick: () => {
                      setActiveBatId(bat.id);
                      setIsCorrectionModalOpen(true);
                    },
                  },
                  {
                    id: 'pin',
                    label: pinnedBatIds.has(bat.id) ? 'Désépingler' : 'Épingler',
                    icon: <Pin className="w-[18px] h-[18px]" />,
                    onClick: () => handleTogglePinBat(bat),
                  },
                ]}
              />
            </InspectorSection>
            <InspectorSection index={2} title={isAr ? 'المواصفات الفنية' : 'Spécifications Prépresse'}>
              <InspectorCard>
                <InspectorKeyValue label="Espace Couleur" value={bat.colorSpace} />
                <InspectorKeyValue label="Résolution" value={`${bat.resolutionDpi} DPI`} />
                <InspectorKeyValue label="Fond Perdu" value={`${bat.bleedMm} mm`} />
                <InspectorKeyValue label="Format / Version" value={`${bat.fileFormat.toUpperCase()} (${bat.versionCode})`} />
                <InspectorKeyValue label="Graphiste" value={bat.uploadedByCreativeName} mono={false} isLast />
              </InspectorCard>
            </InspectorSection>
          </>
        )}
      />

      <KineticSlideOverInspector<PMExpense>
        isOpen={Boolean(inspectedExpense)}
        item={inspectedExpense}
        allItems={filteredProjectExpenses}
        keyExtractor={(e) => e.id}
        openerElement={expenseOpenerEl}
        language={language}
        title={inspectedExpense?.title || ''}
        subtitle={inspectedExpense?.projectTitle}
        categoryLabel={inspectedExpense?.category}
        avatarText="EX"
        onClose={() => setInspectedExpense(null)}
        onSelectItem={(e) => setInspectedExpense(e)}
        onDelete={(e) => {
          batchDeletePmExpenses([e.id]);
          setInspectedExpense(null);
        }}
        holdToDelete
        renderBody={(exp) => (
          <>
            <InspectorSection index={0}>
              <InspectorBigStat
                value={formatMoney(exp.amountDzd, 'DZD')}
                tone="accent"
                caption={`${exp.declaredByUserName} · ${exp.hasFiscalInvoice ? 'Facture Fiscale NIF' : 'Reçu Simple'}`}
              />
            </InspectorSection>
            <InspectorSection index={1} title={isAr ? 'تفاصيل النفقة' : 'Détails Justificatif'}>
              <InspectorCard>
                <InspectorKeyValue label="Catégorie" value={exp.category} mono={false} />
                <InspectorKeyValue label="Déclarant" value={exp.declaredByUserName} mono={false} />
                <InspectorKeyValue label="NIF" value={exp.fiscalNif || 'N/A'} />
                <InspectorKeyValue label="Statut" value={exp.status} mono={false} isLast />
              </InspectorCard>
            </InspectorSection>
            {exp.receiptPhotoUrl && (
              <InspectorSection index={2}>
                <InspectorWideButton
                  label={isAr ? 'عرض الوصل الممسوح' : 'Afficher Scan du Justificatif'}
                  onClick={() => setSelectedReceiptUrl(exp.receiptPhotoUrl || null)}
                />
              </InspectorSection>
            )}
          </>
        )}
      />

      {/* Print Cart Drawer */}
      {isCartOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 h-full p-6 flex flex-col justify-between shadow-2xl border-l border-[#E6DED6] dark:border-neutral-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E6DED6] dark:border-neutral-800">
                <h3 className="t-card font-semibold text-black dark:text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                  {isAr ? 'أمر طلب الطباعة' : isEn ? 'Print Order Cart' : 'Bon de Commande Impression'}
                </h3>
                <button
                  type="button"
                  aria-label="Fermer"
                  onClick={() => setIsCartOpen(false)}
                  data-sq="ctl-sm"
                  className="p-1 hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                <span className="t-cap text-black/55 dark:text-white/55">
                  {isAr ? 'الحملة المرتبطة:' : isEn ? 'Campaign:' : 'Campagne Associée :'}
                </span>
                <div className="font-semibold t-small text-black dark:text-white">
                  {selectedProject?.title}
                </div>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-[50vh] pr-1">
                {cartItems.length === 0 ? (
                  <KineticEmptyStateMotion motionKey={`chef-cart-empty-${language}`}>
                    <EmptyState
                      variant="compact"
                      tone="neutral"
                      icon={<ShoppingBag size={20} />}
                      title={isAr ? 'السلة فارغة' : isEn ? 'Cart is empty' : 'Panier vide'}
                      description={
                        isAr
                          ? 'اختر دعائم من الكتالوج لإضافتها إلى الطلب.'
                          : isEn
                          ? 'Select collateral items from the catalog to add to your order.'
                          : 'Sélectionnez des supports dans le catalogue.'
                      }
                    />
                  </KineticEmptyStateMotion>
                ) : (
                  cartItems.map((ci) => (
                    <div
                      key={ci.item.id}
                      data-sq="ctl"
                      className="p-3 bg-[#FBF8F5] dark:bg-neutral-800/40 flex items-center justify-between gap-3 t-cap"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-black dark:text-white truncate">
                          {ci.item.title}
                        </div>
                        <div className="t-cap text-black/55 dark:text-white/55 tabular-nums">
                          {formatMoney(ci.item.unitCostDzd, 'DZD')} / unité
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(ci.item.id, -1)}
                          data-sq="check"
                          className="w-6 h-6 bg-[#EAE1D8] dark:bg-neutral-700 flex items-center justify-center font-semibold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="tabular-nums font-semibold w-6 text-center">{ci.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(ci.item.id, 1)}
                          data-sq="check"
                          className="w-6 h-6 bg-[#EAE1D8] dark:bg-neutral-700 flex items-center justify-center font-semibold cursor-pointer"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          aria-label="Supprimer"
                          onClick={() => handleRemoveFromCart(ci.item.id)}
                          className="p-1 text-red-500 hover:text-red-700 ml-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="pt-4 border-t border-[#E6DED6] dark:border-neutral-800 space-y-3">
              <div className="flex justify-between items-center t-label font-semibold">
                <span>{isAr ? 'الإجمالي التقديري:' : 'Total Estimé HT :'}</span>
                <span className="tabular-nums t-body text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                  {formatMoney(cartTotalDzd, 'DZD')}
                </span>
              </div>
              <AtriumButton
                type="button"
                variant="primary"
                className="w-full"
                onClick={handleTransmitToCrea}
                disabled={cartItems.length === 0}
                icon={<Send className="w-4 h-4" />}
              >
                {isAr
                  ? 'إرسال للاستوديو لإعداد BAT'
                  : 'Transmettre au Studio Créa pour BAT ➔'}
              </AtriumButton>
            </div>
          </div>
        </div>
      )}

      {/* BAT Correction Modal */}
      {isCorrectionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="sq-elev-pop max-w-md w-full">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-neutral-900 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="t-label font-semibold text-black dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                  {isAr ? 'طلب تعديل على BAT' : 'Demande de Correction BAT'}
                </h3>
                <button
                  type="button"
                  aria-label="Fermer"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  data-sq="ctl-sm"
                  className="p-1 hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                rows={4}
                value={correctionNote}
                onChange={(e) => setCorrectionNote(e.target.value)}
                placeholder={
                  isAr
                    ? 'اذكر التعديلات المطلوبة...'
                    : 'Indiquez les modifications requises (ex: logo client flou, fond perdu insuffisant, coquille texte)...'
                }
                className="w-full px-3 py-2 t-cap rounded-[var(--r-ctl,12px)] border border-[#E6DED6] dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#d4522f]"
              />
              <div className="flex justify-end gap-2">
                <AtriumButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCorrectionModalOpen(false)}
                >
                  {isAr ? 'إلغاء' : 'Annuler'}
                </AtriumButton>
                <AtriumButton type="button" variant="primary" size="sm" onClick={handleRequestRevision}>
                  {isAr ? 'إرسال للاستوديو' : 'Envoyer au Studio Créa'}
                </AtriumButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Image Modal */}
      {selectedReceiptUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="sq-elev-pop max-w-lg w-full">
            <div
              data-sq="panel"
              data-sq-border="solid"
              className="bg-white dark:bg-neutral-900 [--sq-stroke:#E6DED6] dark:[--sq-stroke:#262626] w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="t-label font-semibold text-black dark:text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                  {isAr ? 'وصل الشراء الميداني' : "Justificatif d'Achat Terrain"}
                </h3>
                <button
                  type="button"
                  aria-label="Fermer"
                  onClick={() => setSelectedReceiptUrl(null)}
                  data-sq="ctl-sm"
                  className="p-1 hover:bg-[#F3EDE7] dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={selectedReceiptUrl}
                alt="Justificatif"
                referrerPolicy="no-referrer"
                data-sq="ctl"
                data-sq-border="none"
                className="w-full h-72 object-cover"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedReceiptUrl(null)}
                  data-sq="ctl"
                  className="px-4 py-2 t-small font-semibold text-black/70 dark:text-white/75 bg-[#F3EDE7] dark:bg-neutral-800 cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Fermer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
