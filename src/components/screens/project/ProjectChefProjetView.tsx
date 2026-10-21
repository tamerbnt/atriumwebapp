import React, { useState } from 'react';
import { useAtriumStore } from '../../../services/store';
import { PMCollateralItem, PMPrintOrder } from '../../../types/index';
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
} from 'lucide-react';
import { LabelInput } from '../../ui/LabelInput';
import { Seek } from '../../ui/Seek';
import { FilterSelect } from '../../ui/FilterSelect';
import { useTranslation } from '../../../utils/useTranslation';

interface ProjectChefProjetViewProps {
  initialTab?: 'portfolio' | 'catalog' | 'orders' | 'bat' | 'expenses';
}

export const ProjectChefProjetView: React.FC<ProjectChefProjetViewProps> = ({ initialTab }) => {
  const { t, language, isRtl } = useTranslation();
  const {
    pmProjects,
    pmMilestones,
    pmCollateralCatalog,
    pmPrintOrders,
    pmBatDeliverables,
    pmExpenses,
    pmEquipmentStock,
    addPmPrintOrder,
    reviewPmBatDeliverable,
    addPmExpense,
    activePmSubScreen,
    setActivePmSubScreen,
    showToast,
  } = useAtriumStore();

  const activeTab: 'portfolio' | 'catalog' | 'orders' | 'bat' | 'expenses' =
    (activePmSubScreen === 'catalog' || initialTab === 'catalog')
      ? 'catalog'
      : (activePmSubScreen === 'orders' || initialTab === 'orders')
      ? 'orders'
      : (activePmSubScreen === 'bat' || activePmSubScreen === 'files' || initialTab === 'bat')
      ? 'bat'
      : (activePmSubScreen === 'expenses' || initialTab === 'expenses')
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

  const [catalogSearch, setCatalogSearch] = useState('');
  // Slide 11: Purchase Declaration Form State
  const [purchaseTitle, setPurchaseTitle] = useState('Nappe comptoir brandée');
  const [purchaseAmount, setPurchaseAmount] = useState('8400');
  const [purchaseCategory, setPurchaseCategory] = useState<'materials' | 'catering' | 'transport'>('materials');
  const [purchaseReceiptScan, setPurchaseReceiptScan] = useState('facture_scan.jpg');
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);

  const selectedProject = pmProjects.find((p) => p.id === selectedProjectId) || pmProjects[0];

  const filteredCatalog = pmCollateralCatalog.filter((item) =>
    !catalogSearch.trim() ||
    item.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    item.category.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    item.sku.toLowerCase().includes(catalogSearch.toLowerCase())
  );

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
    if (showToast) {
      showToast({
        title: t('pm_cp_toast_purchase_title'),
        message: msg,
        type: 'success',
      });
    }
    setTimeout(() => setPurchaseSuccessMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
              {t('pm_role_cp_badge')}
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">{t('pm_role_cp_sub')}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {activeTab === 'catalog'
              ? `${t('pm_cp_tab_catalog')} — ${selectedProject?.title}`
              : activeTab === 'portfolio'
              ? `${t('pm_cp_tab_portfolio')} — ${selectedProject?.title}`
              : activeTab === 'orders'
              ? `${t('pm_cp_tab_orders')} — ${selectedProject?.title}`
              : activeTab === 'bat'
              ? `${t('pm_cp_tab_bat')} — ${selectedProject?.title}`
              : `${t('pm_cp_tab_expenses')} — ${selectedProject?.title}`}
          </h1>
        </div>

        {/* Global Project Selector */}
        <FilterSelect
          label={t('pm_kpi_active_projects')}
          value={selectedProjectId}
          onChange={(val) => setSelectedProjectId(typeof val === 'string' ? val : val.target?.value || val)}
          options={pmProjects.map((p) => ({
            value: p.id,
            label: `${p.title} (${p.clientName})`,
          }))}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1 overflow-x-auto">
        {[
          { id: 'portfolio', label: t('pm_cp_tab_portfolio'), icon: FolderKanban },
          { id: 'catalog', label: t('pm_cp_tab_catalog'), icon: ShoppingBag },
          { id: 'orders', label: t('pm_cp_tab_orders'), icon: FileCheck2, count: pmPrintOrders.length },
          { id: 'bat', label: t('pm_cp_tab_bat'), icon: Eye, count: pmBatDeliverables.length },
          { id: 'expenses', label: t('pm_cp_tab_expenses'), icon: DollarSign },
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
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Portfolio & Milestones */}
      {activeTab === 'portfolio' && selectedProject && (
        <div className="space-y-6">
          {/* Project Header Summary Card */}
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#C4785A] uppercase tracking-wider block">
                  {selectedProject.clientName}
                </span>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedProject.title}
                </h2>
                <p className="text-xs text-zinc-500 mt-1 max-w-3xl leading-relaxed">
                  {selectedProject.scopeOfWork}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-zinc-400 block">{t('pm_cp_budget_allocated')}</span>
                <span className="font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {selectedProject.budgetCapDzd.toLocaleString()} DA
                </span>
                <span className="text-xs text-emerald-600 font-semibold block mt-0.5">
                  {t('pm_cp_target_margin', { margin: selectedProject.targetGrossMarginPercent })}
                </span>
              </div>
            </div>

            {/* Burn Rate Warning Banner */}
            {isOverThreshold && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {t('pm_cp_burn_rate_warning', {
                    percent: burnRatePercent,
                    spent: totalExpensesSpent.toLocaleString(),
                    limit: fieldExpensesLimit.toLocaleString(),
                  })}
                </span>
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>{t('pm_cp_activation_progress')}</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {selectedProject.status === 'field_active' ? t('pm_cp_status_field_exec') : t('pm_cp_status_crea_print')}
                </span>
              </div>
              <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#C4785A] to-emerald-500 rounded-full transition-all"
                  style={{ width: selectedProject.status === 'field_active' ? '80%' : '45%' }}
                />
              </div>
            </div>
          </div>

          {/* Sub-Milestones Interactive Timeline */}
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t('pm_cp_milestones_title')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pmMilestones
                .filter((m) => m.projectId === selectedProject.id)
                .map((m, idx) => (
                  <div
                    key={m.id}
                    className={`p-4 rounded-xl border ${
                      m.isCompleted
                        ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-mono text-zinc-400">{t('pm_cp_milestone_step', { step: idx + 1 })}</span>
                      {m.isCompleted ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> {t('pm_cp_milestone_done')}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">{t('pm_cp_milestone_pending')}</span>
                      )}
                    </div>
                    <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{m.title}</p>
                    <div className="text-[11px] text-zinc-500 mt-2 flex items-center justify-between">
                      <span>{t('pm_cp_milestone_deadline', { date: m.targetDate })}</span>
                      <span className="capitalize font-mono text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded">
                        {m.assignedRole}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Promotional & Print Catalog */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Grid (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Le Circuit Fichier Banner (Slide 6) */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                {t('pm_cp_circuit_title')}
              </span>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                  {t('pm_cp_circuit_s1')}
                </span>
                <span className="text-zinc-400">➔</span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                  {t('pm_cp_circuit_s2')}
                </span>
                <span className="text-zinc-400">➔</span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                  {t('pm_cp_circuit_s3')}
                </span>
                <span className="text-zinc-400">➔</span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                  {t('pm_cp_circuit_s4')}
                </span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t('pm_cp_cat_title')}
                </h3>
                <p className="text-xs text-zinc-500">
                  {t('pm_cp_cat_sub')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Seek
                  value={catalogSearch}
                  onChange={setCatalogSearch}
                  placeholder={t('pm_cp_cat_search_ph')}
                  openWidth={260}
                  shutSize={38}
                />
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#C4785A] border border-[#C4785A]/30 hover:bg-[#C4785A]/10 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {t('pm_cp_cat_view_cart', { count: cartItems.length })}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="space-y-3">
                    {item.imageUrl && (
                      <div className="h-36 w-full rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                        <span className="font-mono">{item.sku}</span>
                        <span className="uppercase text-[#C4785A] font-semibold">{item.category}</span>
                      </div>
                      <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                        {item.dimensions} · {item.material}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {item.unitCostDzd.toLocaleString()} DA
                    </span>
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sticky Cart Drawer (1 Col) - Slide 6 Exact Match */}
          <div className="space-y-4">
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#DC2626]" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Ma commande
                  </h3>
                </div>
                <span className="text-xs text-zinc-400 font-mono">{cartItems.length} article(s)</span>
              </div>

              {cartItems.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 space-y-1">
                  <ShoppingBag className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700" />
                  <p className="text-xs">{t('pm_cp_empty_cart_msg')}</p>
                  <p className="text-[11px] text-zinc-400">
                    {t('pm_cp_cat_sub')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {cartItems.map(({ item, quantity }) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 flex items-center justify-between text-xs"
                      >
                        <div className="pr-2">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</p>
                          <span className="text-zinc-500 font-mono">
                            {item.unitCostDzd.toLocaleString()} DA × {quantity}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold px-1">{quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold cursor-pointer"
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">{t('pm_cp_imputation_label')}</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[160px]">
                        {selectedProject?.title}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-zinc-500">{t('pm_cp_order_total_label')}</span>
                      <span className="font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {cartTotalDzd.toLocaleString()} DA
                      </span>
                    </div>

                    <button
                      onClick={handleTransmitToCrea}
                      className="w-full py-2.5 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Envoyer à la Créa →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2.3: Suivi des Commandes Print (Slide 6) */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t('pm_cp_orders_title')}
            </h3>
            <p className="text-xs text-zinc-500">
              {t('pm_cp_orders_sub')}
            </p>
          </div>

          <div className="space-y-3">
            {pmPrintOrders.map((order) => {
              return (
                <div
                  key={order.id}
                  className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {order.orderNumber}
                      </span>
                      <span className="text-zinc-300">·</span>
                      <span className="text-xs font-semibold text-[#C4785A]">
                        {order.projectTitle}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.status === 'sent_to_crea'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : order.status === 'bat_in_progress'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {order.status === 'sent_to_crea'
                          ? 'TRANSMIS AU STUDIO CRÉA'
                          : order.status === 'bat_in_progress'
                          ? 'EN PRODUCTION CRÉA'
                          : 'BAT VALIDÉ / IMPRESSION'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {t('pm_cp_order_items', { items: order.items.map((i) => `${i.quantity}x ${i.itemTitle}`).join(', ') })}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-xs text-zinc-400 block">{t('pm_cp_order_total')}</span>
                      <span className="font-mono font-bold text-base text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {order.totalCostDzd.toLocaleString()} DA
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: BAT Review Center */}
      {activeTab === 'bat' && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {t('pm_cp_bat_hub_title')}
              </h3>
              <p className="text-xs text-zinc-500">
                {t('pm_cp_bat_hub_sub')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pmBatDeliverables
              .filter((bat) => !selectedProjectId || bat.projectId === selectedProjectId)
              .map((bat) => (
                <div
                  key={bat.id}
                  className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C4785A]/10 text-[#C4785A]">
                          {bat.versionCode.toUpperCase()}
                        </span>
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {bat.title}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          bat.approvalStatus === 'approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : bat.approvalStatus === 'revision_requested'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {bat.approvalStatus === 'approved'
                          ? 'BAT VALIDÉ'
                          : bat.approvalStatus === 'revision_requested'
                          ? 'CORRECTION REQUISE'
                          : 'EN ATTENTE REVUE'}
                      </span>
                    </div>

                    {bat.previewUrl && (
                      <div className="h-44 w-full rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 relative">
                        <img
                          src={bat.previewUrl}
                          alt={bat.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-[10px] text-white font-mono">
                          {bat.colorSpace} · {bat.resolutionDpi} DPI · {bat.bleedMm}mm Bleed
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-zinc-500 space-y-1">
                      <p>{t('pm_cp_deposited_by', { name: bat.uploadedByCreativeName })}</p>
                      {bat.revisionComments && (
                        <p className="p-2 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 text-[11px]">
                          Note de correction : « {bat.revisionComments} »
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-2">
                    {bat.approvalStatus !== 'approved' ? (
                      <>
                        <button
                          onClick={() => {
                            setActiveBatId(bat.id);
                            setIsCorrectionModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Demander Correction
                        </button>
                        <button
                          onClick={() => handleApproveBat(bat.id)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Valider le BAT →
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> BAT validé pour fabrication imprimeur
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 4: Project Field Expenses & Slide 11 Purchase Declaration */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Header & Budget Card */}
          <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#C4785A]" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Achats Projet & Déclaration Entrée Stock Indirect (Slide 11)
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Projet actif : <strong>{selectedProject?.title}</strong> · Plafond terrain : {fieldExpensesLimit.toLocaleString()} DA
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-xs text-zinc-400 block">{t('pm_cp_total_consumed')}</span>
                <span className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {totalExpensesSpent.toLocaleString()} DA
                </span>
              </div>
              <div className="w-24">
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mb-1">
                  <span>{t('pm_cp_conso_badge')}</span>
                  <span>{burnRatePercent}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${burnRatePercent}%` }}
                    className={`h-full rounded-full ${
                      isOverThreshold ? 'bg-red-500' : 'bg-[#C4785A]'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Slide 11 Purchase Declaration Card */}
          <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#DC2626]" />
                  Déclarer un Achat de Terrain (Création automatique de code stock NCH-A-00xxx)
                </h4>
                <p className="text-xs text-zinc-500">
                  Tout achat matériel déclaré par le Chef de Projet ou Superviseur est immédiatement codé et tracé à vie dans l'inventaire indirect.
                </p>
              </div>
            </div>

            {purchaseSuccessMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {purchaseSuccessMessage}
              </div>
            )}

            <form onSubmit={handleDeclarePurchase} className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 items-end">
              <div className="md:col-span-2">
                <LabelInput
                  field="Designation"
                  label={t('pm_cp_field_designation')}
                  required
                  placeholder={t('pm_cp_field_designation_ph')}
                  value={purchaseTitle}
                  onChange={setPurchaseTitle}
                  width="100%"
                  height={46}
                  corner={12}
                />
              </div>

              <div>
                <LabelInput
                  field="Montant"
                  label={t('pm_cp_field_amount')}
                  type="number"
                  required
                  value={purchaseAmount}
                  onChange={setPurchaseAmount}
                  width="100%"
                  height={46}
                  corner={12}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Justificatif Scan
                </label>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-mono text-emerald-600 font-bold text-[11px] truncate">
                    {purchaseReceiptScan} ✓
                  </span>
                </div>
              </div>

              <div className="md:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-[#C4785A] hover:bg-[#b3684a] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Déclarer & Coder l'Actif en Stock →
                </button>
              </div>
            </form>
          </div>

          {/* Project Expenses Ledger Table */}
          <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Journal des Achats du Projet ({projectExpenses.length})
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px] font-semibold">
                  <tr>
                    <th className="p-3 rounded-l-lg">{t('pm_cp_table_col_designation')}</th>
                    <th className="p-3">{t('pm_cp_table_col_category')}</th>
                    <th className="p-3">{t('pm_cp_table_col_declared_by')}</th>
                    <th className="p-3">{t('pm_cp_table_col_dir_status')}</th>
                    <th className="p-3 text-right rounded-r-lg">{t('pm_cp_table_col_amount_dzd')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {projectExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                      <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">
                        {exp.title}
                        {exp.hasFiscalInvoice && (
                          <span className="ml-2 text-[10px] text-emerald-600 font-bold uppercase">{t('pm_cp_tax_invoice_tag')}</span>
                        )}
                      </td>
                      <td className="p-3 text-zinc-500 capitalize">{exp.category}</td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-400">{exp.declaredByUserName}</td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            exp.status === 'approved_by_direction'
                              ? 'bg-emerald-100 text-emerald-700'
                              : exp.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {exp.status === 'approved_by_direction'
                            ? 'APPROUVÉ DG'
                            : exp.status === 'rejected'
                            ? 'REJETÉ'
                            : 'EN ATTENTE DG'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {exp.amountDzd.toLocaleString()} DA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Correction Note for BAT */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {t('pm_cp_revision_modal_title')}
            </h3>
            <textarea
              rows={3}
              placeholder={t('pm_cp_revision_ph')}
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsCorrectionModalOpen(false)}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 cursor-pointer"
              >
                {t('common_cancel')}
              </button>
              <button
                onClick={handleRequestRevision}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg cursor-pointer"
              >
                {t('pm_cp_revision_btn_send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
