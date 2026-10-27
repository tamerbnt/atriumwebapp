import React, { useState, useEffect, useMemo } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMCollateralItem, PMPrintOrder, PMBatDeliverable, PMExpense } from '../../../types/index';
import {
  FolderKanban,
  ShoppingBag,
  FileCheck2,
  DollarSign,
  Plus,
  Trash2,
  Send,
  AlertTriangle,
  CheckCircle,
  Eye,
  MessageSquare,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  Printer,
  Building2,
  ChevronDown,
  Download,
  Check,
  Pin,
  X,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';

interface ProjectChefProjetViewProps {
  initialTab?: 'portfolio' | 'catalog' | 'orders' | 'bat' | 'expenses';
}

export const ProjectChefProjetView: React.FC<ProjectChefProjetViewProps> = ({ initialTab }) => {
  const { t, language, isRtl } = useTranslation();
  const {
    currentBranch,
    branches,
    switchBranch,
    pmProjects,
    pmMilestones,
    pmCollateralCatalog,
    pmPrintOrders,
    pmBatDeliverables,
    pmExpenses,
    pmEquipmentStock,
    addPmPrintOrder,
    batchUpdatePmPrintOrderStatus,
    batchDeletePmPrintOrders,
    reviewPmBatDeliverable,
    batchReviewPmBatDeliverables,
    batchDeletePmBatDeliverables,
    addPmExpense,
    batchDeletePmExpenses,
    resetPmMockData,
    activePmSubScreen,
    setActivePmSubScreen,
    showToast,
  } = useAtriumStore();

  // Auto-heal empty mock state on mount
  useEffect(() => {
    if (!pmCollateralCatalog || pmCollateralCatalog.length === 0) {
      resetPmMockData();
    }
  }, [pmCollateralCatalog, resetPmMockData]);

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

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

  const setActiveTab = (tab: 'portfolio' | 'catalog' | 'orders' | 'bat' | 'expenses') => {
    setActivePmSubScreen(tab);
  };

  const [selectedProjectId, setSelectedProjectId] = useState(pmProjects[0]?.id || '');
  const [cartItems, setCartItems] = useState<Array<{ item: PMCollateralItem; quantity: number }>>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeBatId, setActiveBatId] = useState<string | null>(null);
  const [correctionNote, setCorrectionNote] = useState('');
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  // Search & Filters per Tab
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('all');
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('all');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [pinnedOrderIds, setPinnedOrderIds] = useState<Set<string>>(new Set());
  const [ordersSortBy, setOrdersSortBy] = useState('orderNumber');
  const [ordersSortDir, setOrdersSortDir] = useState<'asc' | 'desc'>('desc');

  // BAT Deliverables State
  const [batSearch, setBatSearch] = useState('');
  const [selectedBatIds, setSelectedBatIds] = useState<Set<string>>(new Set());
  const [pinnedBatIds, setPinnedBatIds] = useState<Set<string>>(new Set());

  // Expenses State
  const [expenseSearch, setExpenseSearch] = useState('');
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());

  // Slide 11: Purchase Declaration Form State
  const [purchaseTitle, setPurchaseTitle] = useState('Nappe comptoir brandée');
  const [purchaseAmount, setPurchaseAmount] = useState('8400');
  const [purchaseCategory, setPurchaseCategory] = useState<'materials' | 'catering' | 'transport'>('materials');
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);

  const selectedProject = pmProjects.find((p) => p.id === selectedProjectId) || pmProjects[0];

  // Calculate project expenses
  const projectExpenses = pmExpenses.filter((e) => e.projectId === selectedProject?.id);
  const totalExpensesSpent = projectExpenses.reduce((acc, e) => acc + e.amountDzd, 0);
  const fieldExpensesLimit = selectedProject?.maxFieldExpensesDzd || 1;
  const burnRatePercent = Math.min(Math.round((totalExpensesSpent / fieldExpensesLimit) * 100), 100);
  const isOverThreshold = burnRatePercent >= 85;

  // Cart operations
  const handleAddToCart = (item: PMCollateralItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) => (i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { item, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

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
      facilityId: 'branch_agency_main',
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
  };

  const handleApproveBat = (batId: string) => {
    reviewPmBatDeliverable(batId, 'approved');
  };

  const handleRequestRevision = () => {
    if (activeBatId) {
      reviewPmBatDeliverable(activeBatId, 'revision_requested', correctionNote);
      setIsCorrectionModalOpen(false);
      setCorrectionNote('');
      setActiveBatId(null);
    }
  };

  const handleDeclarePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseTitle || !purchaseAmount || !selectedProject) return;

    addPmExpense({
      tenantId: 'acc_01',
      facilityId: 'branch_agency_main',
      projectId: selectedProject.id,
      projectTitle: selectedProject.title,
      declaredByUserId: 'stf_pm_01',
      declaredByUserName: 'K. Yacine (CDP)',
      declaredByRole: 'chef_projet',
      title: purchaseTitle,
      category: purchaseCategory,
      amountDzd: Number(purchaseAmount),
      receiptPhotoUrl: 'https://images.unsplash.com/photo-1554415707-9e49fe74a64c?w=500&auto=format&fit=crop&q=80',
      fiscalNif: '001916001234567',
      hasFiscalInvoice: true,
    });

    const msg = t('pm_cp_toast_purchase_desc', { title: purchaseTitle });
    setPurchaseSuccessMessage(msg);
    setTimeout(() => setPurchaseSuccessMessage(null), 3000);
    setPurchaseTitle('');
  };

  // Filtered and Sorted Datasets
  const filteredCatalog = useMemo(() => {
    return pmCollateralCatalog.filter((item) => {
      const q = catalogSearch.toLowerCase().trim();
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
    return pmPrintOrders.filter((order) => {
      const q = ordersSearch.toLowerCase().trim();
      const matchQ =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        order.projectTitle.toLowerCase().includes(q) ||
        order.items.some((i) => i.itemTitle.toLowerCase().includes(q));
      const matchStatus = ordersStatusFilter === 'all' || order.status === ordersStatusFilter;
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
        return ordersSortDir === 'asc' ? a.totalCostDzd - b.totalCostDzd : b.totalCostDzd - a.totalCostDzd;
      }
      return 0;
    });
  }, [filteredOrders, pinnedOrderIds, ordersSortBy, ordersSortDir]);

  // Catalog Columns
  const catalogColumns: ColumnDefinition<PMCollateralItem>[] = useMemo(
    () => [
      {
        key: 'item',
        header: 'Support & Réf. POSM',
        width: '2.5*',
        minWidth: '220px',
        renderCell: (item) => (
          <div className="flex items-center gap-3">
            <img src={item.imageUrl} alt={item.title} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-800" />
            <div className="min-w-0">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs truncate max-w-[200px]">
                {item.title}
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                {item.sku} · {item.category}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'dimensions',
        header: 'Format & Spécifications',
        width: '1.5*',
        minWidth: '160px',
        renderCell: (item) => (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
            {item.dimensions}
          </div>
        ),
      },
      {
        key: 'cost',
        header: 'Coût Unitaire DZD',
        width: '1.2*',
        minWidth: '130px',
        align: 'right',
        renderCell: (item) => (
          <div className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatMoney(item.unitCostDzd, 'DZD')}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Commande',
        width: '1*',
        minWidth: '120px',
        align: 'right',
        renderCell: (item) => (
          <AtriumButton
            type="button"
            size="xs"
            variant="primary"
            icon={<ShoppingBag className="w-3.5 h-3.5" />}
            onClick={() => handleAddToCart(item)}
            className="ml-auto"
          >
            Ajouter
          </AtriumButton>
        ),
      },
    ],
    []
  );

  // Orders Columns
  const orderColumns: ColumnDefinition<PMPrintOrder>[] = useMemo(
    () => [
      {
        key: 'orderNumber',
        header: 'Réf. Bon de Commande',
        width: '2*',
        minWidth: '200px',
        sortable: true,
        renderCell: (order) => {
          const isPinned = pinnedOrderIds.has(order.id);
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedOrderIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(order.id)) next.delete(order.id);
                    else next.add(order.id);
                    return next;
                  });
                }}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isPinned ? 'text-[#C4785A] bg-[#C4785A]/10' : 'text-zinc-300 hover:text-zinc-500'
                }`}
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
              </button>
              <div>
                <div className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  {order.orderNumber}
                </div>
                <div className="text-[11px] text-zinc-500 truncate max-w-[170px]">
                  {order.projectTitle}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'items',
        header: 'Détails des Articles POSM',
        width: '2.5*',
        minWidth: '220px',
        renderCell: (order) => (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
            {order.items.slice(0, 2).map((it, idx) => (
              <div key={idx} className="truncate">
                • {it.quantity}x {it.itemTitle}
              </div>
            ))}
            {order.items.length > 2 && (
              <div className="text-[10px] text-zinc-400 italic">
                + {order.items.length - 2} autre(s) référence(s)
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'totalCost',
        header: 'Montant Impression',
        width: '1.5*',
        minWidth: '150px',
        sortable: true,
        align: 'right',
        renderCell: (order) => (
          <div className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatMoney(order.totalCostDzd, 'DZD')}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Statut Production',
        width: '1.5*',
        minWidth: '150px',
        align: 'center',
        renderCell: (order) => {
          const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
            sent_to_crea: { label: 'Transmis Créa', bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300' },
            bat_in_progress: { label: 'BAT en cours', bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300' },
            sent_to_printer: { label: 'Chez l\'Imprimeur', bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300' },
            printed: { label: 'Imprimé & Livré', bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300' },
          };
          const badge = statusConfig[order.status] || { label: order.status, bg: 'bg-zinc-100', text: 'text-zinc-700' };
          return (
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
              {badge.label}
            </span>
          );
        },
      },
    ],
    [pinnedOrderIds]
  );

  // CSV Export for Print Orders
  const handleExportOrdersCsv = () => {
    const headers = ['N° Commande', 'Projet', 'Nombre Articles', 'Montant Total DZD', 'Statut'];
    const rows = sortedOrders.map((o) => [
      `"${o.orderNumber}"`,
      `"${o.projectTitle.replace(/"/g, '""')}"`,
      o.items.reduce((acc, i) => acc + i.quantity, 0),
      o.totalCostDzd,
      o.status,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `commandes_print_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs animate-in fade-in duration-200">
      {/* Header with Facility Switcher & Demo Data */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
              Chef de Projet
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">Coordination & Suivi Print</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {activeTab === 'portfolio'
              ? 'Pilotage Projets & Alertes'
              : activeTab === 'catalog'
              ? 'Catalogue Supports POSM'
              : activeTab === 'orders'
              ? 'Commandes Imprimeur & BAT'
              : activeTab === 'bat'
              ? 'Revue BAT Bon à Tirer'
              : 'Dépenses & Achats Terrain'}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Facility Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsBranchDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-750 transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-[#C4785A]" />
              <span>{currentBranch?.name || 'NCH Cyberpark Tower B'}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {isBranchDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-1.5 z-50">
                {branches && branches.length > 0 ? (
                  branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setIsBranchDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      {b.name}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-zinc-500">NCH Cyberpark Tower B</div>
                )}
              </div>
            )}
          </div>

          {/* Demo Data Recharge Button */}
          <button
            onClick={() => resetPmMockData()}
            title="Recharger les données démo du chef de projet"
            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C4785A]" />
            <span>Demo Data</span>
          </button>

          {/* Cart Trigger */}
          <AtriumButton
            variant="primary"
            size="sm"
            onClick={() => setIsCartOpen(true)}
            icon={<ShoppingBag className="w-3.5 h-3.5" />}
            className="relative"
          >
            <span>Panier Print</span>
            {cartItems.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-[#C4785A] font-bold text-[10px] flex items-center justify-center ml-1">
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            )}
          </AtriumButton>
        </div>
      </div>

      {/* Top Metrics Pod Tray: 3 Inset Cards including Dark Espresso Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'مؤشرات التنسيق الميداني والإنتاج الطباعي' : language === 'fr' ? 'Indicateurs de Coordination & Production Print' : 'Coordination & Print Production Metrics'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'حالة المشاريع قيد التنفيذ، تتبع أوامر الطباعة واستهلاك ميزانية المشتريات الميدانية' : language === 'fr' ? 'Avancement des campagnes, commandes POSM en cours et consommation des plafonds terrain' : 'Campaign execution rate, POSM orders progress, and field expenses burn rate'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Active Retainers & Projects */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {language === 'ar' ? 'المشاريع الخاضعة للمتابعة' : language === 'fr' ? 'Campagnes Supervisées' : 'Supervised Projects'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {pmProjects.length} {language === 'ar' ? 'نشطة' : 'actives'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                {pmProjects.length}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                {language === 'ar' ? 'مخططات الإنتاج قيد الإنجاز' : 'plannings opérationnels en cours'}
              </p>
            </div>
          </div>

          {/* Card 2: Print Orders & BAT pending */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {language === 'ar' ? 'أوامر الطباعة ومراجعة BAT' : language === 'fr' ? 'Commandes Print & BAT' : 'Print Orders & BAT'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                {pmPrintOrders.length} {language === 'ar' ? 'أمر' : 'ordres'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums font-mono">
                {pmBatDeliverables.filter((b) => b.approvalStatus === 'pending_review').length} {language === 'ar' ? 'BAT بانتظار التأشير' : 'BAT en attente'}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                {pmPrintOrders.length} {language === 'ar' ? 'طلبيات طباعة في المطبعة' : 'commandes POSM transmises'}
              </p>
            </div>
          </div>

          {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) — Total Field Expenses */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'المشتريات الميدانية (Slide 11)' : language === 'fr' ? 'Dépenses Terrain Consommées' : 'Field Expenses Spent'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                {burnRatePercent}% {language === 'ar' ? 'مستهلك' : 'consommé'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] tabular-nums font-mono">
                {formatMoney(totalExpensesSpent, 'DZD')}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>{language === 'ar' ? `سقف المشروع: ${formatMoney(fieldExpensesLimit, 'DZD')}` : `Plafond : ${formatMoney(fieldExpensesLimit, 'DZD')}`}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1 overflow-x-auto">
        {[
          { id: 'portfolio', label: 'Pilotage & Budgets', icon: FolderKanban },
          { id: 'catalog', label: 'Catalogue POSM', icon: ShoppingBag, count: pmCollateralCatalog.length },
          { id: 'orders', label: 'Commandes Imprimeur', icon: Printer, count: pmPrintOrders.length },
          { id: 'bat', label: 'Revue BAT', icon: FileCheck2, count: pmBatDeliverables.filter((b) => b.approvalStatus === 'pending_review').length },
          { id: 'expenses', label: 'Dépenses Terrain', icon: DollarSign, count: projectExpenses.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2.5 px-4 border-b-2 font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#C4785A] text-[#C4785A]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: PILOTAGE & BUDGETS */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#C4785A] uppercase tracking-wider block">
                Contrôle des Plafonds Dépenses Terrain (Slide 6 & 11)
              </span>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {selectedProject?.title}
              </h2>
              <div className="text-xs text-zinc-500">
                Client : <span className="font-semibold text-zinc-700 dark:text-zinc-300">{selectedProject?.clientName}</span> · Plafond autorisé : <span className="font-mono font-bold">{formatMoney(selectedProject?.maxFieldExpensesDzd || 0, 'DZD')}</span>
              </div>
            </div>

            <div className="w-full sm:w-64 space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-zinc-500">Consommé Terrain :</span>
                <span className={`font-mono tabular-nums ${isOverThreshold ? 'text-red-600 font-bold' : 'text-zinc-900 dark:text-zinc-100'}`}>
                  {formatMoney(totalExpensesSpent, 'DZD')} ({burnRatePercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isOverThreshold ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${burnRatePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Grid of Projects Roadmaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pmProjects.map((p) => {
              const spent = pmExpenses.filter((e) => e.projectId === p.id).reduce((acc, e) => acc + e.amountDzd, 0);
              const limit = p.maxFieldExpensesDzd || 1;
              const pct = Math.min(Math.round((spent / limit) * 100), 100);
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                    selectedProject?.id === p.id
                      ? 'border-[#C4785A] bg-[#C4785A]/5 dark:bg-[#C4785A]/10 ring-1 ring-[#C4785A]'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-[#C4785A] uppercase truncate">{p.clientName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {p.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2 truncate">
                    {p.title}
                  </h3>
                  <div className="space-y-1 text-xs text-zinc-500">
                    <div className="flex justify-between">
                      <span>Plafond Global:</span>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatMoney(p.budgetCapDzd, 'DZD')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dépenses Terrain:</span>
                      <span className="font-mono">{formatMoney(spent, 'DZD')} / {formatMoney(limit, 'DZD')}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mt-3">
                    <div className={`h-full ${pct >= 85 ? 'bg-red-500' : 'bg-[#C4785A]'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CATALOGUE SUPPORTS POSM (UniversalDataCollection) */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-3 text-xs flex-1 max-w-xl">
              <Seek
                value={catalogSearch}
                onChange={setCatalogSearch}
                placeholder="Rechercher totem, rollup, kakemono, stand..."
                openWidth={360}
                shutSize={38}
              />
              <FilterSelect
                label="Catégorie"
                value={catalogCategory}
                onChange={(val) => setCatalogCategory(typeof val === 'string' ? val : val.target?.value || val)}
                options={[
                  { value: 'all', label: 'Toutes les catégories' },
                  { value: 'stand', label: 'Stands & Comptoirs' },
                  { value: 'display', label: 'Totems & Roll-ups' },
                  { value: 'print', label: 'Flyers & Affiches' },
                  { value: 'textile', label: 'Textiles & Casquettes' },
                ]}
              />
            </div>

            <div className="text-xs text-zinc-500 font-semibold">
              {filteredCatalog.length} support(s) configuré(s)
            </div>
          </div>

          <UniversalDataCollection<PMCollateralItem>
            items={filteredCatalog}
            keyExtractor={(i) => i.id}
            defaultViewMode="grid"
            columns={catalogColumns}
            renderCard={(item) => (
              <div className="flex flex-col justify-between h-full space-y-3">
                <div className="space-y-2">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-36 rounded-xl object-cover border border-zinc-100 dark:border-zinc-800"
                  />
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                    <span>{item.sku}</span>
                    <span className="uppercase text-[#C4785A] font-bold">{item.category}</span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">
                    Format : {item.dimensions}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatMoney(item.unitCostDzd, 'DZD')}
                  </span>
                  <AtriumButton
                    type="button"
                    size="xs"
                    variant="primary"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => handleAddToCart(item)}
                  >
                    Commander
                  </AtriumButton>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* TAB 3: COMMANDES IMPRIMEUR & PRINT (UniversalDataCollection) */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-3 text-xs flex-1 max-w-xl">
              <Seek
                value={ordersSearch}
                onChange={setOrdersSearch}
                placeholder="Rechercher par n° de bon ou campagne..."
                openWidth={360}
                shutSize={38}
              />
              <FilterSelect
                label="Statut"
                value={ordersStatusFilter}
                onChange={(val) => setOrdersStatusFilter(typeof val === 'string' ? val : val.target?.value || val)}
                options={[
                  { value: 'all', label: 'Tous les statuts' },
                  { value: 'sent_to_crea', label: 'Transmis Créa' },
                  { value: 'bat_in_progress', label: 'BAT en cours' },
                  { value: 'sent_to_printer', label: 'Chez l\'Imprimeur' },
                  { value: 'printed', label: 'Imprimé & Livré' },
                ]}
              />
            </div>

            <button
              onClick={handleExportOrdersCsv}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Batch Actions Toolbar */}
          {selectedOrderIds.size > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-[#C4785A]/10 border border-[#C4785A]/30 rounded-2xl animate-in fade-in">
              <div className="flex items-center gap-3 text-xs font-semibold text-[#C4785A]">
                <span>{selectedOrderIds.size} commande(s) sélectionnée(s)</span>
                <button
                  type="button"
                  onClick={() => setSelectedOrderIds(new Set())}
                  className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
                >
                  Désélectionner
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    batchUpdatePmPrintOrderStatus(Array.from(selectedOrderIds), 'in_print');
                    setSelectedOrderIds(new Set());
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-xl transition-colors cursor-pointer"
                >
                  Envoyer à l'Imprimeur
                </button>
                <button
                  type="button"
                  onClick={() => {
                    batchUpdatePmPrintOrderStatus(Array.from(selectedOrderIds), 'delivered');
                    setSelectedOrderIds(new Set());
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors cursor-pointer"
                >
                  Marquer Imprimé & Reçu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    batchDeletePmPrintOrders(Array.from(selectedOrderIds));
                    setSelectedOrderIds(new Set());
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
              </div>
            </div>
          )}

          <UniversalDataCollection<PMPrintOrder>
            items={sortedOrders}
            keyExtractor={(o) => o.id}
            defaultViewMode="list"
            columns={orderColumns}
            sortBy={ordersSortBy}
            sortDirection={ordersSortDir}
            onSortChange={(key) => {
              if (ordersSortBy === key) {
                setOrdersSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setOrdersSortBy(key);
                setOrdersSortDir('asc');
              }
            }}
            selectedIds={selectedOrderIds}
            onSelectionChange={setSelectedOrderIds}
            renderCard={(order) => (
              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                    <span>{order.orderNumber}</span>
                    <span className="text-zinc-500 font-normal">{order.status}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {order.projectTitle}
                  </h4>
                  <div className="text-xs text-zinc-500 mt-2 space-y-1">
                    {order.items.map((it, idx) => (
                      <div key={idx}>• {it.quantity}x {it.itemTitle}</div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Total :</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatMoney(order.totalCostDzd, 'DZD')}
                  </span>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* TAB 4: REVUE BAT DELIVERABLES */}
      {activeTab === 'bat' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
            <Seek
              value={batSearch}
              onChange={setBatSearch}
              placeholder="Rechercher par livrable ou campagne..."
              openWidth={360}
              shutSize={38}
            />
            {selectedBatIds.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    batchReviewPmBatDeliverables(Array.from(selectedBatIds), 'approved');
                    setSelectedBatIds(new Set());
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors cursor-pointer"
                >
                  Valider Bon à Tirer ({selectedBatIds.size})
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pmBatDeliverables
              .filter((b) => !batSearch.trim() || b.title.toLowerCase().includes(batSearch.toLowerCase()) || b.projectTitle.toLowerCase().includes(batSearch.toLowerCase()))
              .map((bat) => (
                <div
                  key={bat.id}
                  className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3"
                >
                  <img
                    src={bat.previewUrl}
                    alt={bat.title}
                    className="w-full h-44 rounded-xl object-cover border border-zinc-100 dark:border-zinc-800"
                  />
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-[#C4785A] uppercase truncate">{bat.projectTitle}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      bat.approvalStatus === 'approved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : bat.approvalStatus === 'revision_requested'
                        ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {bat.approvalStatus === 'approved' ? 'Bon à Tirer Validé' : bat.approvalStatus === 'revision_requested' ? 'Corrections Demandées' : 'En Attente de Revue'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {bat.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                    <span>{bat.colorSpace}</span>
                    <span>·</span>
                    <span>{bat.resolutionDpi} DPI</span>
                    <span>·</span>
                    <span>Fond perdu : {bat.bleedMm}mm</span>
                  </div>

                  {bat.revisionComments && (
                    <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs">
                      Note CDP : {bat.revisionComments}
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBatId(bat.id);
                        setIsCorrectionModalOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Demander Révision
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveBat(bat.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors cursor-pointer"
                    >
                      Valider BAT
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 5: DEPENSES & ACHATS TERRAIN */}
      {activeTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between">
              <Seek
                value={expenseSearch}
                onChange={setExpenseSearch}
                placeholder="Rechercher par titre de dépense..."
                openWidth={300}
                shutSize={38}
              />
              <span className="text-xs text-zinc-500 font-semibold">
                {projectExpenses.length} dépense(s) pour ce projet
              </span>
            </div>

            <div className="space-y-3">
              {projectExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        {exp.category}
                      </span>
                      <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                        {exp.title}
                      </span>
                      {exp.hasFiscalInvoice && (
                        <span className="text-[10px] text-emerald-600 font-bold">
                          Facture Fiscale
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Par {exp.declaredByUserName} · Statut : <span className="font-semibold">{exp.status}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {formatMoney(exp.amountDzd, 'DZD')}
                    </span>
                    {exp.receiptPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptUrl(exp.receiptPhotoUrl || null)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                        title="Voir le justificatif"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right 5 cols: Purchase Declaration Form (Slide 11) */}
          <div className="lg:col-span-5 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div>
              <span className="text-xs font-bold text-[#C4785A] uppercase tracking-wider block">
                Déclaration d'Achat Terrain (Slide 11)
              </span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                Saisie Immédiate & Codage Stock
              </h3>
              <p className="text-xs text-zinc-500">
                Génère automatiquement une référence d'immobilisation indirecte pour l'agence.
              </p>
            </div>

            {purchaseSuccessMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                {purchaseSuccessMessage}
              </div>
            )}

            <form onSubmit={handleDeclarePurchase} className="space-y-4">
              <LabelInput
                field="PurchaseTitle"
                label="Désignation du Matériel"
                value={purchaseTitle}
                onChange={setPurchaseTitle}
                required
                height={44}
                corner={12}
              />

              <LabelInput
                field="PurchaseAmount"
                label="Montant TTC (DZD)"
                type="number"
                value={purchaseAmount}
                onChange={setPurchaseAmount}
                required
                height={44}
                corner={12}
              />

              <FilterSelect
                label="Nature de l'Achat"
                value={purchaseCategory}
                onChange={(val) => setPurchaseCategory((typeof val === 'string' ? val : val.target?.value || val) as any)}
                options={[
                  { value: 'materials', label: 'Matériel & Mobilier Stand' },
                  { value: 'catering', label: 'Restauration Animateurs' },
                  { value: 'transport', label: 'Carburant & Transport' },
                ]}
              />

              <AtriumButton
                type="submit"
                variant="primary"
                className="w-full"
                icon={<Plus className="w-4 h-4" />}
              >
                Déclarer & Imputer au Projet
              </AtriumButton>
            </form>
          </div>
        </div>
      )}

      {/* Cart Slide-Over / Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 h-full p-6 flex flex-col justify-between shadow-2xl border-l border-zinc-200 dark:border-zinc-800">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#C4785A]" />
                  Bon de Commande Impression
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-zinc-400">Campagne Associée :</span>
                <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  {selectedProject?.title}
                </div>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[50vh] pr-1">
                {cartItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-400">
                    Le panier est vide. Sélectionnez des supports dans le catalogue.
                  </div>
                ) : (
                  cartItems.map((ci) => (
                    <div
                      key={ci.item.id}
                      className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {ci.item.title}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {formatMoney(ci.item.unitCostDzd, 'DZD')} / unité
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(ci.item.id, -1)}
                          className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold w-6 text-center">{ci.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(ci.item.id, 1)}
                          className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold cursor-pointer"
                        >
                          +
                        </button>
                        <button
                          type="button"
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

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex justify-between items-center text-sm font-bold">
                <span>Total Estimé HT :</span>
                <span className="font-mono text-base text-[#C4785A] tabular-nums">
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
                Transmettre au Studio Créa pour BAT ➔
              </AtriumButton>
            </div>
          </div>
        </div>
      )}

      {/* BAT Revision Request Modal */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#C4785A]" />
                Demande de Correction BAT
              </h3>
              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              rows={4}
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              placeholder="Indiquez les modifications requises (ex: logo client flou, fond perdu insuffisant, coquille dans le texte légal)..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#C4785A]"
            />
            <div className="flex justify-end gap-2">
              <AtriumButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCorrectionModalOpen(false)}
              >
                Annuler
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="primary"
                size="sm"
                onClick={handleRequestRevision}
              >
                Envoyer au Studio Créa
              </AtriumButton>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#C4785A]" />
                Justificatif d'Achat Terrain
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReceiptUrl(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img src={selectedReceiptUrl} alt="Justificatif" className="w-full h-72 object-cover rounded-xl" />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReceiptUrl(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-xl cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
