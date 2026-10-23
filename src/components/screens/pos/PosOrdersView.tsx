import React, { useState, useMemo } from 'react';
import {
  Receipt,
  PauseCircle,
  PlayCircle,
  Search,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Clock,
  Printer,
  ShoppingBag,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { ParkedOrder, Sale } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { Seek } from '../../ui/Seek';
import { useTranslation } from '../../../utils/useTranslation';

export const PosOrdersView: React.FC = () => {
  const { language } = useTranslation();
  const { parkedOrders, sales, resumeParkedOrder, deleteParkedOrder, currentBranch, setScreen } = useAtriumStore();

  const [activeTab, setActiveTab] = useState<'parked' | 'completed'>('parked');
  const [searchQuery, setSearchQuery] = useState('');

  const handleRecallOrder = (order: ParkedOrder) => {
    resumeParkedOrder(order.id);
    showToast({
      type: 'info',
      title: 'Commande rappelée',
      message: `${order.referenceName} chargée en caisse`,
    });
    setScreen('shop');
  };

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.memberName && s.memberName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.items.some((i) => i.productName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [sales, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
              <Receipt size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-neutral-900 dark:text-white">
                Commandes en Pause & Historique des Tickets
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {currentBranch.name} · {parkedOrders.length} tickets en attente de paiement · {sales.length} ventes clôturées
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher ticket ou client..."
              openWidth={260}
              shutSize={36}
            />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('parked')}
            className={`px-3.5 py-1.5 rounded-full font-bold transition-colors cursor-pointer ${
              activeTab === 'parked'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
            }`}
          >
            Tickets en attente ({parkedOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-3.5 py-1.5 rounded-full font-bold transition-colors cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
            }`}
          >
            Tickets clôturés ({sales.length})
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'parked' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parkedOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-[#18181B] rounded-[22px] p-5 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs hover:border-[#C4785A]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {order.referenceName}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-neutral-500 max-h-36 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="py-1 flex justify-between">
                      <span>{item.quantity}× {item.productName}</span>
                      <span className="font-mono text-neutral-800 dark:text-neutral-200">{formatMoney(item.totalPrice, language)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 block">Total ticket:</span>
                  <span className="text-base font-black text-neutral-900 dark:text-white tabular-nums">
                    {formatMoney(order.totalAmount, language)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => deleteParkedOrder(order.id)}
                    className="p-2 rounded-xl text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    title="Supprimer ticket"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRecallOrder(order)}
                    className="px-3 py-1.5 rounded-xl bg-[#C4785A] text-white font-bold text-xs hover:bg-[#b3684a] flex items-center gap-1 cursor-pointer"
                  >
                    <PlayCircle size={13} />
                    <span>Rappeler en caisse</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {parkedOrders.length === 0 && (
            <div className="col-span-full py-16 text-center text-xs text-neutral-400 bg-white dark:bg-[#18181B] rounded-[26px] border border-[#E9EEF0] dark:border-neutral-800">
              Aucun ticket en pause. Les commandes mises en attente apparaîtront ici.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#18181B] rounded-[26px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 font-bold border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  <th className="p-3.5 pl-6">N° Ticket</th>
                  <th className="p-3.5">Client</th>
                  <th className="p-3.5">Mode Règlement</th>
                  <th className="p-3.5">Date & Heure</th>
                  <th className="p-3.5">Articles</th>
                  <th className="p-3.5 pr-6 text-right">Montant Encaissé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="p-3.5 pl-6 font-mono font-bold text-neutral-900 dark:text-white">
                      #{sale.id.slice(-6).toUpperCase()}
                    </td>
                    <td className="p-3.5">
                      {sale.memberName || 'Client Comptoir'}
                    </td>
                    <td className="p-3.5 font-semibold">
                      {sale.paymentMethod}
                    </td>
                    <td className="p-3.5 font-mono text-neutral-400">
                      {new Date(sale.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-neutral-500">
                      {sale.items.length} articles
                    </td>
                    <td className="p-3.5 pr-6 text-right font-black text-neutral-900 dark:text-white tabular-nums text-sm">
                      {formatMoney(sale.totalAmount, language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
