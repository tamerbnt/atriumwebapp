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
  Home,
  ChevronDown,
  RefreshCw,
  ShieldCheck,
  Clock,
  Warehouse,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { StockMovementVoucher, WarehouseDepot, Product } from '../../../types';
import { formatMoney } from '../../../utils/rules';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { StockMovementModal } from './StockMovementModal';
import { LabelInput } from '../../ui/LabelInput';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { useTranslation } from '../../../utils/useTranslation';

type ViewMode = 'stock_state' | 'vouchers';

export const TradingInventoryView: React.FC = () => {
  const { t, isRtl, language } = useTranslation();
  const {
    products,
    warehouses,
    stockVouchers,
    createWarehouseDepot,
    currentBranch,
    branches,
    switchBranch,
    resetTradingMockData,
  } = useAtriumStore();

  const [selectedDepotId, setSelectedDepotId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('stock_state');
  const [searchQuery, setSearchQuery] = useState('');
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [newDepotModalOpen, setNewDepotModalOpen] = useState(false);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  // New Depot form
  const [depotCode, setDepotCode] = useState('');
  const [depotName, setDepotName] = useState('');
  const [depotAddress, setDepotAddress] = useState('');
  const [depotCity, setDepotCity] = useState('Alger');

  // Overall Stock Valuation & Stats
  const metrics = useMemo(() => {
    const totalVal = products.reduce(
      (sum, p) => sum + (p.stockQuantity || 0) * (p.cost?.amount || p.costPrice || 0),
      0
    );
    const lowStockCount = products.filter(
      (p) => (p.stockQuantity || 0) <= (p.reorderLevel || 10)
    ).length;
    const totalUnits = products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0);

    return {
      totalValuation: totalVal,
      lowStockCount,
      totalUnits,
      depotsCount: warehouses.length,
      vouchersCount: stockVouchers.length,
    };
  }, [products, warehouses, stockVouchers]);

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
        <span className="font-mono text-xs font-bold text-neutral-700 dark:text-neutral-300">
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
          <span className="font-bold text-neutral-900 dark:text-neutral-100 block">
            {prod.name}
          </span>
          <span className="text-[10px] text-neutral-400">
            {prod.category} {prod.supplier ? `• Fournisseur: ${prod.supplier}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'stock',
      header: t('trading_inventory_col_qty_on_hand', 'Stock Réel'),
      width: '120px',
      renderCell: (prod) => {
        const isLow = (prod.stockQuantity || 0) <= (prod.reorderLevel || 10);
        return (
          <div className="text-xs font-mono">
            <span
              className={`font-bold tabular-nums ${
                isLow ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-neutral-100'
              }`}
            >
              {prod.stockQuantity || 0} {prod.unit || 'u'}
            </span>
            {isLow && (
              <span className="block text-[9px] text-rose-500 font-semibold uppercase">
                {t('trading_inventory_low_stock_warning', 'Alerte Réappro')}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'cost',
      header: t('trading_inventory_col_cost', 'Coût PMP (HT)'),
      width: '120px',
      renderCell: (prod) => (
        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400 tabular-nums">
          {formatMoney(prod.cost?.amount || prod.costPrice || 0)}
        </span>
      ),
    },
    {
      key: 'price',
      header: t('trading_catalog_col_price', 'Prix Vente HT'),
      width: '120px',
      renderCell: (prod) => (
        <span className="font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
          {formatMoney(prod.price?.amount || 0)}
        </span>
      ),
    },
    {
      key: 'valuation',
      header: t('trading_inventory_col_total_val', 'Valorisation Stock'),
      width: '150px',
      renderCell: (prod) => {
        const val = (prod.stockQuantity || 0) * (prod.cost?.amount || prod.costPrice || 0);
        return (
          <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white tabular-nums">
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
      width: '180px',
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
            <span className="text-neutral-900 dark:text-neutral-100">{v.voucherNumber}</span>
          </div>
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      width: '110px',
      renderCell: (v) => <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400">{v.date}</span>,
    },
    {
      key: 'depots',
      header: 'Trajet / Dépôts',
      minWidth: '220px',
      renderCell: (v) => (
        <div className="text-xs">
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {v.depotSourceName}
          </span>
          {v.type === 'transfert' && v.depotTargetName && (
            <span className="text-neutral-500 flex items-center gap-1 text-[11px]">
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
        <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
          {v.reason.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'valuation',
      header: 'Valeur du Bon',
      width: '140px',
      renderCell: (v) => (
        <span className="font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 tabular-nums">
          {formatMoney(v.totalValuationDzd)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-6">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <Boxes size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {t('trading_inventory_title', 'Dépôts Logistiques & Inventaire')}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C4785A]/15 text-[#C4785A] border border-[#C4785A]/30">
                  {warehouses.length} {language === 'ar' ? 'مستودعات' : 'dépôts actifs'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t('trading_inventory_subtitle', 'Gestion multi-dépôts, suivi des stocks en temps réel et bons d\'entrée/sortie/transfert')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
            {/* Facility Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
              >
                <Home size={15} className="text-[#C4785A]" />
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {currentBranch?.name || 'Dépôt Central'}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-neutral-500 transition-transform ${
                    isFacilityDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isFacilityDropdownOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {language === 'ar' ? 'المستودعات والفروع' : 'Dépôts & Points de Vente'}
                  </div>
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left rtl:text-right text-xs hover:bg-neutral-50 dark:hover:bg-neutral-700/50 flex items-center justify-between"
                    >
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{b.name}</span>
                      {b.id === currentBranch?.id && <span className="text-[#C4785A] text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Demo Data Reset */}
            <button
              type="button"
              onClick={() => resetTradingMockData && resetTradingMockData()}
              className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Réinitialiser les données B2B de test"
            >
              <RefreshCw size={13} className="text-neutral-500" />
              <span>{language === 'ar' ? 'بيانات تجريبية' : 'Démo B2B'}</span>
            </button>

            {/* Actions */}
            <AtriumButton
              variant="outline"
              size="sm"
              onClick={() => setNewDepotModalOpen(true)}
              icon={<Building2 size={14} className="text-[#C4785A]" />}
            >
              {t('trading_inventory_new_depot', 'Nouveau Dépôt')}
            </AtriumButton>

            <AtriumButton
              variant="primary"
              size="sm"
              onClick={() => setMovementModalOpen(true)}
              icon={<Plus size={15} />}
            >
              {t('trading_inventory_new_movement', 'Nouveau Bon de Mouvement')}
            </AtriumButton>
          </div>
        </div>

        {/* Top Metrics Pod Tray (SurfaceBgElevated: #F8F9FA, CornerRadius 24px) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: Références Articles en Stock */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'المقالات والوحدات المخزنة' : 'Références & Volume Réel'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  {products.length} SKUs
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {metrics.totalUnits.toLocaleString()} <span className="text-xs text-neutral-400 font-normal">unités</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                  {metrics.lowStockCount > 0 ? (
                    <span className="text-rose-500 font-semibold flex items-center gap-1">
                      <AlertTriangle size={13} />
                      {metrics.lowStockCount} référence(s) en rupture imminente
                    </span>
                  ) : (
                    <span className="text-emerald-500 font-medium flex items-center gap-1">
                      <ShieldCheck size={13} />
                      Niveaux de stocks nominaux
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Dépôts Logistiques & Mouvements */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'المستودعات وسندات النقل' : 'Maillage & Mouvements'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                  {metrics.depotsCount} sites
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {metrics.vouchersCount}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                  <Clock size={13} className="text-blue-500" />
                  <span>Bons d'entrée, sortie et transferts inter-dépôts</span>
                </div>
              </div>
            </div>

            {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#E7E5E4]">
                  {language === 'ar' ? 'إجمالي قيمة المخزون الحالية' : 'Valorisation Totale du Stock'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">
                  Coût PMP (HT)
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">
                  {formatMoney(metrics.totalValuation)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Warehouse size={12} className="text-[#FB923C]" />
                    <span>Actif circulant multi-dépôts</span>
                  </span>
                  <span className="font-mono text-stone-300">DZD</span>
                </div>
              </div>

              {/* Decorative Subtle Background Sparkline */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FB923C]/5 rounded-full blur-2xl pointer-events-none" />
            </div>

          </div>
        </div>

        {/* Multi-Depot Hub Pod Tray (SurfaceBgElevated: #F8F9FA, CornerRadius 24px) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#EDF1F3] dark:border-neutral-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
                <Warehouse size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  {t('trading_inventory_depots_hub', 'Réseau des Dépôts & Hubs Logistiques')}
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">
                  Filtrage actif du stock par entrepôt physique ou valorisation consolidée
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-neutral-500">
              {warehouses.length} {t('trading_depots_active', 'dépôts configurés')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setSelectedDepotId('all')}
              className={`p-3.5 rounded-2xl border text-left rtl:text-right transition-all cursor-pointer ${
                selectedDepotId === 'all'
                  ? 'border-[#C4785A] bg-white dark:bg-neutral-800 shadow-xs ring-2 ring-[#C4785A]/20'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/80 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                  {t('trading_inventory_all_depots', 'Tous les Dépôts')}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 font-semibold">
                  GLOBAL
                </span>
              </div>
              <div className="text-xs font-bold font-mono text-[#C4785A]">
                {formatMoney(metrics.totalValuation)}
              </div>
            </button>

            {warehouses.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedDepotId(w.id)}
                className={`p-3.5 rounded-2xl border text-left rtl:text-right transition-all cursor-pointer ${
                  selectedDepotId === w.id
                    ? 'border-[#C4785A] bg-white dark:bg-neutral-800 shadow-xs ring-2 ring-[#C4785A]/20'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/80 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                    {w.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 font-semibold">
                    {w.code}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 mb-0.5">{w.city}</div>
                <div className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200">
                  {formatMoney(w.totalValuationDzd || 0)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Collection Pod Tray (SurfaceBgElevated: #F8F9FA) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          
          {/* Integrated Toolbar: Left Anchor + Controls Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Left Title / Icon / Count Anchor */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
                <Boxes size={18} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-neutral-900 dark:text-white">
                  {viewMode === 'stock_state'
                    ? t('trading_inventory_tab_state', 'État des Stocks')
                    : t('trading_inventory_tab_vouchers', 'Bons de Mouvements')}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#C4785A]/10 text-[#C4785A] font-semibold font-mono">
                  {viewMode === 'stock_state' ? filteredProducts.length : filteredVouchers.length}
                </span>
              </div>
            </div>

            {/* Controls Bar: Segment Tabs + Seek Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Segment Capsules */}
              <div className="flex items-center gap-1.5 bg-neutral-200/60 dark:bg-neutral-800 p-1 rounded-2xl self-start">
                <button
                  type="button"
                  onClick={() => setViewMode('stock_state')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    viewMode === 'stock_state'
                      ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>{t('trading_inventory_tab_state', 'État des Stocks')}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    viewMode === 'stock_state' ? 'bg-[#C4785A]/15 text-[#C4785A]' : 'bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500'
                  }`}>
                    {products.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('vouchers')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    viewMode === 'vouchers'
                      ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>{t('trading_inventory_tab_vouchers', 'Bons de Mouvements')}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    viewMode === 'vouchers' ? 'bg-[#C4785A]/15 text-[#C4785A]' : 'bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500'
                  }`}>
                    {stockVouchers.length}
                  </span>
                </button>
              </div>

              {/* Seek Search */}
              <div className="self-end sm:self-auto">
                <Seek
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={language === 'ar' ? 'بحث برمز المادة، التسمية، السند...' : 'Filtrer article, bon, SKU...'}
                  shutSize={36}
                  openWidth={280}
                />
              </div>
            </div>
          </div>

          {/* Table Container Inside Pod Tray */}
          <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs overflow-hidden">
            {viewMode === 'stock_state' ? (
              <UniversalDataCollection
                items={filteredProducts}
                keyExtractor={(p) => p.id}
                columns={stockColumns}
                renderCard={(p) => (
                  <div className="p-4 border rounded-xl space-y-1">
                    <span className="font-mono text-xs">{p.sku}</span>
                    <p className="font-bold text-xs">{p.name}</p>
                    <div className="flex justify-between text-xs pt-1 border-t border-neutral-100 dark:border-neutral-700">
                      <span>Stock : {p.stockQuantity}</span>
                      <span className="font-bold text-[#C4785A]">{formatMoney(p.price?.amount || 0)}</span>
                    </div>
                  </div>
                )}
                emptyTitle={language === 'ar' ? 'لا توجد مقالات في هذا المستودع' : 'Aucun article dans ce dépôt'}
                emptyDescription={
                  language === 'ar'
                    ? 'قم بإدخال مواد للمستودع عبر سندات الاستلام أو حركات المخزون.'
                    : 'Effectuez une réception à quai ou un bon de mouvement d\'entrée pour approvisionner ce dépôt.'
                }
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
                    <div className="flex justify-between text-xs pt-1 border-t border-neutral-100 dark:border-neutral-700">
                      <span>{v.date}</span>
                      <span className="font-bold text-[#C4785A]">{formatMoney(v.totalValuationDzd)}</span>
                    </div>
                  </div>
                )}
                emptyTitle={language === 'ar' ? 'لا توجد حركات مخزون مسجلة' : 'Aucun mouvement de stock enregistré'}
                emptyDescription={
                  language === 'ar'
                    ? 'أنشئ أول سند دخول، خروج أو تحويل بين المستودعات.'
                    : 'Créez votre premier bon d\'entrée, de sortie ou de transfert inter-dépôts ci-dessus.'
                }
              />
            )}
          </div>

        </div>

      </div>

      {/* Modals */}
      <StockMovementModal
        isOpen={movementModalOpen}
        onClose={() => setMovementModalOpen(false)}
      />

      {/* New Depot Modal */}
      {newDepotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
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

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <AtriumButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewDepotModalOpen(false)}
                >
                  Annuler
                </AtriumButton>
                <AtriumButton
                  type="submit"
                  variant="primary"
                  size="sm"
                >
                  Créer le Dépôt
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
