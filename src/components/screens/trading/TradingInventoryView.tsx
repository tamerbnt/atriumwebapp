import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Building2,
  AlertTriangle,
  Search,
  Filter,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { StockMovementVoucher, WarehouseDepot, Product } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { StockMovementModal } from './StockMovementModal';
import { LabelInput } from '../../ui/LabelInput';
import { useTranslation } from '../../../utils/useTranslation';

type ViewMode = 'stock_state' | 'vouchers';

export const TradingInventoryView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const {
    products,
    warehouses,
    stockVouchers,
    createWarehouseDepot,
  } = useAtriumStore();

  const [selectedDepotId, setSelectedDepotId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('stock_state');
  const [searchQuery, setSearchQuery] = useState('');
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [newDepotModalOpen, setNewDepotModalOpen] = useState(false);

  // New Depot form
  const [depotCode, setDepotCode] = useState('');
  const [depotName, setDepotName] = useState('');
  const [depotAddress, setDepotAddress] = useState('');
  const [depotCity, setDepotCity] = useState('Alger');

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = (p.sku || '').toLowerCase().includes(q);
        const matchesCat = (p.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesCat) return false;
      }
      return true;
    });
  }, [products, searchQuery]);

  // Filtered Vouchers
  const filteredVouchers = useMemo(() => {
    return stockVouchers.filter((v) => {
      if (selectedDepotId !== 'all') {
        if (v.depotSourceId !== selectedDepotId && v.depotTargetId !== selectedDepotId) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = v.voucherNumber.toLowerCase().includes(q);
        const matchesReason = v.reason.toLowerCase().includes(q);
        const matchesOp = (v.operatorName || '').toLowerCase().includes(q);
        if (!matchesNum && !matchesReason && !matchesOp) return false;
      }
      return true;
    });
  }, [stockVouchers, selectedDepotId, searchQuery]);

  // Overall Stock Valuation
  const totalValuation = useMemo(() => {
    return products.reduce(
      (sum, p) => sum + (p.stockQuantity || 0) * (p.cost?.amount || p.costPrice || 0),
      0
    );
  }, [products]);

  const handleCreateDepot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depotCode || !depotName) return;

    createWarehouseDepot({
      businessId: 'biz_trading',
      branchId: 'branch_trading_main',
      tenantId: 'acc_01',
      facilityId: 'branch_trading_main',
      code: depotCode.trim().toUpperCase(),
      name: depotName.trim(),
      address: depotAddress.trim() || 'Alger',
      city: depotCity.trim() || 'Alger',
      isMain: false,
      totalSkusCount: 0,
      totalValuationDzd: 0,
    });

    setDepotCode('');
    setDepotName('');
    setDepotAddress('');
    setNewDepotModalOpen(false);
  };

  // Stock Table Columns
  const stockColumns: ColumnDefinition<Product>[] = [
    {
      key: 'sku',
      header: 'Code SKU',
      width: '130px',
      renderCell: (prod) => (
        <span className="font-mono text-xs font-bold text-stone-700 dark:text-stone-300">
          {prod.sku || 'N/A'}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Désignation de l\'Article',
      minWidth: '240px',
      renderCell: (prod) => (
        <div className="text-xs">
          <span className="font-bold text-stone-900 dark:text-stone-100 block">
            {prod.name}
          </span>
          <span className="text-[10px] text-stone-400">
            {prod.category} {prod.supplier ? `• Fournisseur: ${prod.supplier}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock Réel',
      width: '110px',
      renderCell: (prod) => {
        const isLow = (prod.stockQuantity || 0) <= (prod.reorderLevel || 10);
        return (
          <div className="text-xs font-mono">
            <span
              className={`font-bold tabular-nums ${
                isLow ? 'text-rose-600' : 'text-stone-900 dark:text-stone-100'
              }`}
            >
              {prod.stockQuantity || 0} {prod.unit || 'u'}
            </span>
            {isLow && (
              <span className="block text-[9px] text-rose-500 font-semibold uppercase">
                Alerte Réappro
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'cost',
      header: 'Coût PMP (HT)',
      width: '110px',
      renderCell: (prod) => (
        <span className="font-mono text-xs text-stone-600 dark:text-stone-400 tabular-nums">
          {formatMoney(prod.cost?.amount || prod.costPrice || 0)}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Prix Vente HT',
      width: '110px',
      renderCell: (prod) => (
        <span className="font-mono text-xs font-semibold text-stone-800 dark:text-stone-200 tabular-nums">
          {formatMoney(prod.price?.amount || 0)}
        </span>
      ),
    },
    {
      key: 'valuation',
      header: 'Valorisation Stock',
      width: '140px',
      renderCell: (prod) => {
        const val = (prod.stockQuantity || 0) * (prod.cost?.amount || prod.costPrice || 0);
        return (
          <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100 tabular-nums">
            {formatMoney(val)}
          </span>
        );
      },
    },
  ];

  // Voucher Table Columns
  const voucherColumns: ColumnDefinition<StockMovementVoucher>[] = [
    {
      key: 'voucherNumber',
      header: 'N° Bon de Mouvement',
      width: '160px',
      renderCell: (v) => {
        const badgeColor =
          v.type === 'entree'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
            : v.type === 'sortie'
            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400';

        return (
          <div className="flex items-center gap-2 font-mono text-xs font-bold">
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${badgeColor}`}>
              {v.type === 'entree' ? 'BE' : v.type === 'sortie' ? 'BS' : 'BT'}
            </span>
            <span>{v.voucherNumber}</span>
          </div>
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      width: '100px',
      renderCell: (v) => <span className="font-mono text-xs text-stone-600">{v.date}</span>,
    },
    {
      key: 'depots',
      header: 'Trajet / Dépôts',
      minWidth: '200px',
      renderCell: (v) => (
        <div className="text-xs">
          <span className="font-medium text-stone-900 dark:text-stone-100">
            {v.depotSourceName}
          </span>
          {v.type === 'transfert' && v.depotTargetName && (
            <span className="text-stone-500 flex items-center gap-1 text-[11px]">
              &rarr; {v.depotTargetName}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Motif',
      width: '160px',
      renderCell: (v) => (
        <span className="text-xs font-mono text-stone-600 dark:text-stone-400">
          {v.reason.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'valuation',
      header: 'Valeur du Bon',
      width: '130px',
      renderCell: (v) => (
        <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100 tabular-nums">
          {formatMoney(v.totalValuationDzd)}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Dépôts Logistiques & Inventaire
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C4785A]/15 text-[#C4785A]">
              Valorisation : {formatMoney(totalValuation)}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Gestion multi-dépôts, suivi des stocks en temps réel et bons d'entrée/sortie/transfert
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNewDepotModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300 text-stone-700 dark:text-stone-300 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Building2 size={14} className="text-[#C4785A]" />
            <span>Nouveau Dépôt</span>
          </button>

          <button
            onClick={() => setMovementModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#C4785A] hover:bg-[#b06749] text-white shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus size={15} />
            <span>Nouveau Bon de Mouvement</span>
          </button>
        </div>
      </div>

      {/* Depots Horizontal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => setSelectedDepotId('all')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            selectedDepotId === 'all'
              ? 'border-[#C4785A] bg-[#C4785A]/10 shadow-xs'
              : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
              Tous les Dépôts
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-800 font-semibold">
              GLOBAL
            </span>
          </div>
          <div className="text-sm font-bold font-mono text-[#C4785A]">
            {formatMoney(totalValuation)}
          </div>
        </button>

        {warehouses.map((w) => (
          <button
            key={w.id}
            onClick={() => setSelectedDepotId(w.id)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              selectedDepotId === w.id
                ? 'border-[#C4785A] bg-[#C4785A]/10 shadow-xs'
                : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                {w.name}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-800 font-semibold">
                {w.code}
              </span>
            </div>
            <div className="text-xs text-stone-500 mb-1">{w.city}</div>
            <div className="text-xs font-mono font-bold text-stone-800 dark:text-stone-200">
              {formatMoney(w.totalValuationDzd || 0)}
            </div>
          </button>
        ))}
      </div>

      {/* Tabs & Search */}
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('stock_state')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              viewMode === 'stock_state'
                ? 'bg-[#C4785A]/10 text-[#C4785A] font-bold border border-[#C4785A]/30'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            État des Stocks & Valorisation ({products.length})
          </button>

          <button
            onClick={() => setViewMode('vouchers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              viewMode === 'vouchers'
                ? 'bg-[#C4785A]/10 text-[#C4785A] font-bold border border-[#C4785A]/30'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            Bons de Mouvement (Entrées, Sorties & Transferts) ({stockVouchers.length})
          </button>
        </div>

        <div className="w-64">
          <input
            type="text"
            placeholder="Filtrer article, bon, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:outline-hidden focus:border-[#C4785A]"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xs overflow-hidden">
        {viewMode === 'stock_state' ? (
          <UniversalDataCollection
            items={filteredProducts}
            keyExtractor={(p) => p.id}
            columns={stockColumns}
            renderCard={(p) => (
              <div className="p-4 border rounded-xl space-y-1">
                <span className="font-mono text-xs">{p.sku}</span>
                <p className="font-bold text-xs">{p.name}</p>
                <div className="flex justify-between text-xs pt-1 border-t">
                  <span>Stock : {p.stockQuantity}</span>
                  <span className="font-bold">{formatMoney(p.price?.amount || 0)}</span>
                </div>
              </div>
            )}
            emptyTitle="Aucun article dans ce dépôt"
          />
        ) : (
          <UniversalDataCollection
            items={filteredVouchers}
            keyExtractor={(v) => v.id}
            columns={voucherColumns}
            renderCard={(v) => (
              <div className="p-4 border rounded-xl space-y-1">
                <span className="font-mono text-xs">{v.voucherNumber}</span>
                <p className="font-bold text-xs">{v.reason}</p>
                <div className="flex justify-between text-xs pt-1 border-t">
                  <span>{v.date}</span>
                  <span className="font-bold">{formatMoney(v.totalValuationDzd)}</span>
                </div>
              </div>
            )}
            emptyTitle="Aucun mouvement de stock enregistré"
          />
        )}
      </div>

      {/* Modals */}
      <StockMovementModal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
      />

      {/* New Depot Modal */}
      {newDepotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Building2 size={18} className="text-[#C4785A]" />
              <span>Ajouter un Nouveau Dépôt</span>
            </h2>

            <form onSubmit={handleCreateDepot} className="space-y-3 text-xs">
              <LabelInput
                label="Code Dépôt *"
                placeholder="Ex: DEP-03"
                value={depotCode}
                onChange={(e: any) => setDepotCode(e.target.value)}
                required
              />

              <LabelInput
                label="Nom du Dépôt / Hangar *"
                placeholder="Ex: Dépôt Annaba Port"
                value={depotName}
                onChange={(e: any) => setDepotName(e.target.value)}
                required
              />

              <LabelInput
                label="Adresse Logistique"
                placeholder="Ex: Quai Ouest, Zone Portuaire"
                value={depotAddress}
                onChange={(e: any) => setDepotAddress(e.target.value)}
              />

              <LabelInput
                label="Ville"
                placeholder="Ex: Annaba"
                value={depotCity}
                onChange={(e: any) => setDepotCity(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setNewDepotModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:bg-[#b06749]"
                >
                  Créer le Dépôt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
