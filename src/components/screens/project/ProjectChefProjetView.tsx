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

interface ProjectChefProjetViewProps {
  initialTab?: 'portfolio' | 'catalog' | 'orders' | 'bat' | 'expenses';
}

export const ProjectChefProjetView: React.FC<ProjectChefProjetViewProps> = ({ initialTab }) => {
  const {
    pmProjects,
    pmMilestones,
    pmCollateralCatalog,
    pmPrintOrders,
    pmBatDeliverables,
    pmExpenses,
    addPmPrintOrder,
    reviewPmBatDeliverable,
    activePmSubScreen,
    setActivePmSubScreen,
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

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C4785A]">
              Rôle 2 · Chef de Projet
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-500">Supervision de Campagnes & Matériel</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {activeTab === 'catalog'
              ? `Commander — ${selectedProject?.title}`
              : activeTab === 'portfolio'
              ? `Mes projets — ${selectedProject?.title}`
              : activeTab === 'orders'
              ? `Suivi commandes — ${selectedProject?.title}`
              : activeTab === 'bat'
              ? `Fichiers reçus & BAT — ${selectedProject?.title}`
              : `Achats & Frais — ${selectedProject?.title}`}
          </h1>
        </div>

        {/* Global Project Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-medium">Projet Actif:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
          >
            {pmProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.clientName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'portfolio'
              ? 'bg-[#C4785A] text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          2.1 Mes projets
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-[#C4785A] text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          2.2 Commander (PLV & Print)
          {cartItems.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white text-[#C4785A] text-[10px] font-bold">
              {cartItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-[#C4785A] text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          2.3 Suivi commandes
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-mono">
            {pmPrintOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('bat')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'bat'
              ? 'bg-[#C4785A] text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          2.4 Fichiers reçus & BAT
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-[#C4785A] text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          2.5 Achats & Dépenses
        </button>
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
                <span className="text-xs text-zinc-400 block">Budget Total Alloué</span>
                <span className="font-mono text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {selectedProject.budgetCapDzd.toLocaleString()} DA
                </span>
                <span className="text-xs text-emerald-600 font-semibold block mt-0.5">
                  Marge Cible: {selectedProject.targetGrossMarginPercent}%
                </span>
              </div>
            </div>

            {/* Burn Rate Warning Banner */}
            {isOverThreshold && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Alerte Consommation Budget:</strong> {burnRatePercent}% des frais de terrain ont déjà été engagés ({totalExpensesSpent.toLocaleString()} DA / {fieldExpensesLimit.toLocaleString()} DA plafond).
                </span>
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Avancement du Processus d'Activation</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {selectedProject.status === 'field_active' ? '80% (En Exécution Terrain)' : '45% (Créa & Print)'}
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
              Jalons Opérationnels (Milestones)
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
                      <span className="font-mono text-zinc-400">Étape {idx + 1}</span>
                      {m.isCompleted ? (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Clôturé
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">À réaliser</span>
                      )}
                    </div>
                    <p className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">{m.title}</p>
                    <div className="text-[11px] text-zinc-500 mt-2 flex items-center justify-between">
                      <span>Échéance: {m.targetDate}</span>
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
            {/* Le Circuit Fichier Banner (Slide 6) */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                LE CIRCUIT FICHIER
              </span>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                  1. Le CDP commande
                </span>
                <span className="text-zinc-400">➔</span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                  2. La Créa produit
                </span>
                <span className="text-zinc-400">➔</span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                  3. Retour au CDP
                </span>
                <span className="text-zinc-400">➔</span>
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xs">
                  4. Transmission imprimeur
                </span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Catalogue PLV, Bannières & Textile
                </h3>
                <p className="text-xs text-zinc-500">
                  Commandez les supports physiques pour vos activations de terrain.
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-[#C4785A] border border-[#C4785A]/30 hover:bg-[#C4785A]/10 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Voir Panier ({cartItems.length})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pmCollateralCatalog.map((item) => (
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
                  <p className="text-xs">Le panier est vide.</p>
                  <p className="text-[11px] text-zinc-400">
                    Sélectionnez vos bannières, roll-up ou comptoirs PLV pour transmettre la commande au Studio Créa.
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
                      <span className="text-zinc-500">Imputation :</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[160px]">
                        Projet : {selectedProject?.title}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-zinc-500">Total Commande :</span>
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
          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Suivi des Ordres de Fabrication & Commandes Print
              </h3>
              <p className="text-xs text-zinc-500">
                Suivez en temps réel la prise en charge de vos commandes par le Studio Créa jusqu'au BAT final.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('catalog')}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#C4785A] hover:bg-[#b3684a] rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvelle Commande
            </button>
          </div>

          <div className="space-y-3">
            {pmPrintOrders.map((order) => {
              const isDelivered = order.status === 'bat_approved' || order.status === 'printed';
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
                      Articles : {order.items.map((i) => `${i.quantity}x ${i.itemTitle}`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-xs text-zinc-400 block">Total Fabrication</span>
                      <span className="font-mono font-bold text-base text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {order.totalCostDzd.toLocaleString()} DA
                      </span>
                    </div>

                    <button
                      onClick={() => setActiveTab('bat')}
                      className="px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
                    >
                      Voir les BAT ➔
                    </button>
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
                Centre de Validation BAT (Bon à Tirer)
              </h3>
              <p className="text-xs text-zinc-500">
                Inspectez la fidélité colorimétrique (CMJN), les marges de bords perdus (3mm), et validez l'ordre d'impression.
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
                      <p>Déposé par : <strong>{bat.uploadedByCreativeName}</strong> (Studio Créa)</p>
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

      {/* TAB 4: Project Field Expenses */}
      {activeTab === 'expenses' && (
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Frais et Achats de Terrain — {selectedProject?.title}
              </h3>
              <p className="text-xs text-zinc-500">
                Plafond alloué au terrain: {fieldExpensesLimit.toLocaleString()} DA
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-400 block">Total Consommé</span>
              <span className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                {totalExpensesSpent.toLocaleString()} DA
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                <tr>
                  <th className="p-3 rounded-l-lg">Désignation</th>
                  <th className="p-3">Catégorie</th>
                  <th className="p-3">Déclaré Par</th>
                  <th className="p-3">Statut Direction</th>
                  <th className="p-3 text-right rounded-r-lg">Montant DZD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {projectExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                    <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {exp.title}
                      {exp.hasFiscalInvoice && (
                        <span className="ml-2 text-[10px] text-emerald-600 font-bold uppercase">Facture NIF</span>
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
      )}

      {/* Modal: Correction Note for BAT */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Demande de Correction BAT
            </h3>
            <textarea
              rows={3}
              placeholder="Ex: Ajuster le logo client à 15cm du bord supérieur et corriger le texte légal..."
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsCorrectionModalOpen(false)}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800"
              >
                Annuler
              </button>
              <button
                onClick={handleRequestRevision}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg"
              >
                Envoyer au Studio Créa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
