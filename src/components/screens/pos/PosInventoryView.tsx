import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Minus,
  Search,
  Filter,
  AlertTriangle,
  ArrowDownUp,
  RotateCw,
  CheckCircle2,
  DollarSign,
  Download,
  Barcode,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { Product } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { Seek } from '../../ui/Seek';
import { useTranslation } from '../../../utils/useTranslation';

export const PosInventoryView: React.FC = () => {
  const { language } = useTranslation();
  const { products, updateProduct, currentBranch } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery));

      if (stockFilter === 'low') return matchSearch && p.stockQuantity <= (p.reorderLevel || 5);
      if (stockFilter === 'out') return matchSearch && p.stockQuantity <= 0;
      return matchSearch;
    });
  }, [products, searchQuery, stockFilter]);

  const handleAdjustStock = (product: Product, delta: number) => {
    const newQty = Math.max(0, product.stockQuantity + delta);
    updateProduct(product.id, { stockQuantity: newQty });
    showToast({
      type: 'info',
      title: 'Ajustement de stock',
      message: `${product.name} : ${product.stockQuantity} → ${newQty} ${product.unit || 'pcs'}`,
    });
  };

  const totalInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.price.amount * p.stockQuantity), 0);
  }, [products]);

  const totalSKUs = products.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] p-6 border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] flex items-center justify-center shrink-0 border border-[#F5E2D8] dark:border-neutral-700">
              <Package size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-neutral-900 dark:text-white">
                {language === 'ar' ? 'إدارة المخزون والمستودع' : language === 'fr' ? 'Gestion des Stocks & Répertoire Articles' : 'Inventory & Stock Management'}
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {currentBranch.name} · {totalSKUs} références actives en stock · Valeur marchande: {formatMoney(totalInventoryValue, language)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'بحث بالاسم، كود SKU أو الباركود...' : 'Rechercher par nom, SKU ou code-barres...'}
              openWidth={300}
              shutSize={36}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <button
            type="button"
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer ${
              stockFilter === 'all'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
            }`}
          >
            Tous les articles ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('low')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer ${
              stockFilter === 'low'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            Stock critique ({products.filter((p) => p.stockQuantity <= (p.reorderLevel || 5)).length})
          </button>
          <button
            type="button"
            onClick={() => setStockFilter('out')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer ${
              stockFilter === 'out'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100'
            }`}
          >
            En rupture ({products.filter((p) => p.stockQuantity <= 0).length})
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-[#18181B] rounded-[26px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 font-bold border-b border-neutral-100 dark:border-neutral-800">
              <tr>
                <th className="p-3.5 pl-6">Article & Réf SKU</th>
                <th className="p-3.5">Catégorie</th>
                <th className="p-3.5">Prix Vente</th>
                <th className="p-3.5">Prix Revient</th>
                <th className="p-3.5">Quantité en Stock</th>
                <th className="p-3.5 pr-6 text-right">Ajustement Rapide</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
              {filteredProducts.map((p) => {
                const isLow = p.stockQuantity <= (p.reorderLevel || 5);
                const isOut = p.stockQuantity <= 0;
                return (
                  <tr key={p.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="p-3.5 pl-6 font-bold text-neutral-900 dark:text-white">
                      {p.name}
                      <span className="text-[11px] text-neutral-400 font-mono block">
                        SKU: {p.sku} {p.barcode && `· Code: ${p.barcode}`}
                      </span>
                    </td>
                    <td className="p-3.5 text-neutral-500">
                      {p.category || 'Général'}
                    </td>
                    <td className="p-3.5 font-black text-neutral-900 dark:text-white tabular-nums">
                      {formatMoney(p.price.amount, language)}
                    </td>
                    <td className="p-3.5 text-neutral-400 tabular-nums">
                      {p.cost?.amount ? formatMoney(p.cost.amount, language) : '—'}
                    </td>
                    <td className="p-3.5">
                      <span className={`font-black tabular-nums text-sm ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-neutral-900 dark:text-white'}`}>
                        {p.stockQuantity} {p.unit || 'pcs'}
                      </span>
                      {isLow && !isOut && (
                        <span className="text-[10px] text-amber-600 font-bold block">Seuil d'alerte atteint</span>
                      )}
                      {isOut && (
                        <span className="text-[10px] text-rose-600 font-bold block">Rupture de stock</span>
                      )}
                    </td>
                    <td className="p-3.5 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(p, -1)}
                          disabled={p.stockQuantity <= 0}
                          className="w-7 h-7 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(p, 1)}
                          className="w-7 h-7 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
