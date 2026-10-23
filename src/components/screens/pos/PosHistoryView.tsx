import React, { useState, useMemo } from 'react';
import {
  History,
  Receipt,
  Search,
  Filter,
  Calendar,
  Printer,
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  ShoppingBag,
  CreditCard,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { Sale } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { Seek } from '../../ui/Seek';
import { useTranslation } from '../../../utils/useTranslation';

export const PosHistoryView: React.FC = () => {
  const { language } = useTranslation();
  const { sales, currentBranch } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'card' | 'other'>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.memberName && s.memberName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.items.some((i) => i.productName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (methodFilter === 'cash') {
        return !s.paymentMethod || s.paymentMethod.toLowerCase().includes('esp') || s.paymentMethod.toLowerCase().includes('cash');
      }
      if (methodFilter === 'card') {
        return s.paymentMethod && (s.paymentMethod.toLowerCase().includes('carte') || s.paymentMethod.toLowerCase().includes('dahabia') || s.paymentMethod.toLowerCase().includes('cib') || s.paymentMethod.toLowerCase().includes('card'));
      }
      if (methodFilter === 'other') {
        return (
          s.paymentMethod &&
          !s.paymentMethod.toLowerCase().includes('esp') &&
          !s.paymentMethod.toLowerCase().includes('cash') &&
          !s.paymentMethod.toLowerCase().includes('carte') &&
          !s.paymentMethod.toLowerCase().includes('dahabia') &&
          !s.paymentMethod.toLowerCase().includes('cib') &&
          !s.paymentMethod.toLowerCase().includes('card')
        );
      }
      return true;
    });
  }, [sales, searchQuery, methodFilter]);

  const handleReprintReceipt = (sale: Sale, e?: React.MouseEvent) => {
    e?.stopPropagation();
    showToast({
      type: 'info',
      title: 'Impression en cours',
      message: `Ticket #${sale.id.slice(-6).toUpperCase()} envoyé à l'imprimante ticket`,
    });
  };

  const handleProcessRefund = (sale: Sale, e?: React.MouseEvent) => {
    e?.stopPropagation();
    showToast({
      type: 'warning',
      title: 'Avoir / Remboursement généré',
      message: `Ticket #${sale.id.slice(-6).toUpperCase()} remboursé avec succès`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
              <History size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-neutral-900 dark:text-white">
                {language === 'ar' ? 'أرشيف المبيعات وإيصالات التذاكر' : language === 'fr' ? 'Historique & Audit des Ventes Caisse' : 'POS Sales & Receipt Audit Trail'}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {currentBranch.name} · {sales.length} transactions enregistrées dans le journal de caisse
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher ticket, client, article..."
              openWidth={260}
              shutSize={36}
            />
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <span className="text-[11px] font-bold text-neutral-400 mr-1">Règlement:</span>
          {(['all', 'cash', 'card', 'other'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethodFilter(m)}
              className={`px-3 py-1.5 rounded-full font-bold transition-colors cursor-pointer ${
                methodFilter === m
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
              }`}
            >
              {m === 'all'
                ? 'Tous les tickets'
                : m === 'cash'
                ? 'Espèces'
                : m === 'card'
                ? 'CIB / Dahabia'
                : 'Autres'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 font-bold border-b border-neutral-100 dark:border-neutral-800">
              <tr>
                <th className="p-3.5 pl-6">N° Ticket</th>
                <th className="p-3.5">Date & Heure</th>
                <th className="p-3.5">Client</th>
                <th className="p-3.5">Mode Règlement</th>
                <th className="p-3.5">Articles</th>
                <th className="p-3.5 text-right">Montant Encaissé</th>
                <th className="p-3.5 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
              {filteredSales.map((sale) => (
                <tr
                  key={sale.id}
                  onClick={() => setSelectedSale(sale)}
                  className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 cursor-pointer transition-colors"
                >
                  <td className="p-3.5 pl-6 font-mono font-bold text-neutral-900 dark:text-white">
                    #{sale.id.slice(-6).toUpperCase()}
                  </td>
                  <td className="p-3.5 font-mono text-neutral-500 text-[11px]">
                    {new Date(sale.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3.5 font-semibold">
                    {sale.memberName || 'Client Comptoir'}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {sale.paymentMethod || 'Espèces'}
                    </span>
                  </td>
                  <td className="p-3.5 text-neutral-500">
                    {sale.items.length} {sale.items.length > 1 ? 'articles' : 'article'}
                  </td>
                  <td className="p-3.5 text-right font-black text-neutral-900 dark:text-white tabular-nums text-sm">
                    {formatMoney(sale.totalAmount, language)}
                  </td>
                  <td className="p-3.5 pr-6 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleReprintReceipt(sale, e)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                        title="Réimprimer ticket"
                      >
                        <Printer size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleProcessRefund(sale, e)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Rembourser / Avoir"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSales.length === 0 && (
          <div className="py-16 text-center text-xs text-neutral-400">
            Aucune vente ne correspond aux critères sélectionnés.
          </div>
        )}
      </div>

      {/* Sale Detail Drawer / Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl max-w-md w-full animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Ticket #{selectedSale.id.slice(-6).toUpperCase()}
                </h3>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {new Date(selectedSale.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs">
                <span className="text-neutral-400 block">Client :</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {selectedSale.memberName || 'Client Comptoir'}
                </span>
              </div>

              <div className="text-xs">
                <span className="text-neutral-400 block mb-1">Articles facturés :</span>
                <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3 divide-y divide-neutral-100 dark:divide-neutral-800 space-y-1">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="pt-1 first:pt-0 flex justify-between">
                      <span className="text-neutral-800 dark:text-neutral-200">
                        {item.quantity}× {item.productName}
                      </span>
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">
                        {formatMoney(item.totalPrice, language)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center text-sm font-black text-neutral-900 dark:text-white">
                <span>Total Encaissé :</span>
                <span className="text-emerald-600 font-mono text-base">
                  {formatMoney(selectedSale.totalAmount, language)}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => handleReprintReceipt(selectedSale)}
                className="flex-1 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer size={14} /> Imprimer Ticket
              </button>
              <button
                type="button"
                onClick={() => {
                  handleProcessRefund(selectedSale);
                  setSelectedSale(null);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw size={14} /> Rembourser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
