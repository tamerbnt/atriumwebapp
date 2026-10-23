import React, { useMemo } from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  CreditCard,
  Banknote,
  Clock,
  ArrowRight,
  Plus,
  Receipt,
  Store,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';

export const PosDashboardView: React.FC = () => {
  const { language } = useTranslation();
  const { sales, products, parkedOrders, currentBranch, setScreen } = useAtriumStore();

  const totalGrossSales = useMemo(() => {
    return sales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [sales]);

  const totalTransactions = sales.length;
  const avgBasket = totalTransactions > 0 ? Math.round(totalGrossSales / totalTransactions) : 0;

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= (p.reorderLevel || 5));
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= 0);
  }, [products]);

  const recentSales = useMemo(() => {
    return sales.slice(-6).reverse();
  }, [sales]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
              <Store size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-neutral-900 dark:text-white">
                  Tableau de Bord Caisse & Point de Vente
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  Commerce & Restaurant
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {currentBranch.name} · Caisse enregistreuse rapide, gestion des stocks et commandes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setScreen('shop')}
              className="h-10 px-5 rounded-full bg-[#C4785A] hover:bg-[#b3684a] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <ShoppingCart size={15} />
              <span>Ouvrir la Caisse Enregistreuse</span>
            </button>
          </div>
        </div>

        {/* 4 POS Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-neutral-500 block">Chiffre d'Affaires Caisse</span>
            <span className="text-xl font-black text-emerald-600 tabular-nums mt-1 block">
              {formatMoney(totalGrossSales, language)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">{totalTransactions} encaissements</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-neutral-500 block">Panier Moyen</span>
            <span className="text-xl font-black text-neutral-900 dark:text-white tabular-nums mt-1 block">
              {formatMoney(avgBasket, language)}
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">Par ticket de caisse</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-neutral-500 block">Commandes en Attente (Tickets)</span>
            <span className="text-xl font-black text-blue-600 tabular-nums mt-1 block">
              {parkedOrders.length}
            </span>
            <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">Tables / Commandes en pause</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800">
            <span className="text-neutral-500 block">Alertes Réapprovisionnement</span>
            <span className={`text-xl font-black tabular-nums mt-1 block ${lowStockProducts.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {lowStockProducts.length} articles
            </span>
            <span className="text-[10px] text-neutral-400 block mt-0.5">{outOfStockProducts.length} en rupture totale</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Transactions & Low Stock Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <div className="lg:col-span-2 bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Derniers Tickets Encaissés
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Historique des ventes récentes au comptoir
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScreen('registrations')}
              className="text-xs font-bold text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Voir tous les tickets</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {recentSales.map((sale) => (
              <div key={sale.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 dark:text-white">
                      Ticket #{sale.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      {sale.paymentMethod}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-0.5 block">
                    {sale.items.length} articles · {new Date(sale.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black text-neutral-900 dark:text-white tabular-nums block">
                    {formatMoney(sale.totalAmount, language)}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold">Validé</span>
                </div>
              </div>
            ))}

            {recentSales.length === 0 && (
              <div className="py-10 text-center text-xs text-neutral-400">
                Aucun encaissement pour le moment.
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              Stock Critique
            </h2>
            <button
              type="button"
              onClick={() => setScreen('scheduler')}
              className="text-xs font-bold text-[#C4785A] hover:underline"
            >
              Gérer stock
            </button>
          </div>

          <div className="space-y-2.5">
            {lowStockProducts.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-neutral-900 dark:text-white block">
                    {p.name}
                  </span>
                  <span className="text-[11px] text-amber-800 dark:text-amber-300 font-mono">
                    SKU: {p.sku}
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-black text-amber-700 dark:text-amber-400 tabular-nums block">
                    {p.stockQuantity} {p.unit || 'pcs'}
                  </span>
                  <span className="text-[10px] text-neutral-400">Seuil: {p.reorderLevel || 5}</span>
                </div>
              </div>
            ))}

            {lowStockProducts.length === 0 && (
              <div className="py-8 text-center text-xs text-emerald-600 font-semibold">
                Tous les niveaux de stock sont optimaux ✓
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
