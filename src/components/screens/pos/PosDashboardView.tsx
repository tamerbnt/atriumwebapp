import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  TrendingUp,
  Receipt,
  Package,
  AlertTriangle,
  CreditCard,
  Banknote,
  Coins,
  ArrowRight,
  Printer,
  Sparkles,
  Building2,
  CheckCircle2,
  Clock,
  RotateCcw,
  Plus,
  PlayCircle,
  FileText,
  Home,
  ChevronDown,
  RefreshCw,
  Warehouse,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { Sale, Product } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { Modal } from '../../ui/Modal';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';

export interface PosDashboardViewProps {
  onAddMember?: () => void;
  onOpenVoucherModal?: () => void;
}

type SalesFilterMode = 'all' | 'today' | 'refunded';

export const PosDashboardView: React.FC<PosDashboardViewProps> = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    products,
    sales,
    parkedOrders,
    currentBranch,
    branches,
    switchBranch,
    setScreen,
    refundSale,
    resumeParkedOrder,
    resetPosMockData,
    receiptConfig,
    currentUser,
  } = useAtriumStore();

  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [selectedSaleForRefund, setSelectedSaleForRefund] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState('Customer Request / Avoir');
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());
  const [pinnedSaleIds, setPinnedSaleIds] = useState<Set<string>>(new Set());
  const [isZReportOpen, setIsZReportOpen] = useState(false);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<SalesFilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sales for current branch or retail
  const branchSales = useMemo(() => {
    return sales.filter(
      (s) => s.facilityId === currentBranch.id || s.id.startsWith('sale_pos_')
    );
  }, [sales, currentBranch.id]);

  // Today's sales
  const todaySales = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return branchSales.filter((s) => s.createdAt.startsWith(today));
  }, [branchSales]);

  // Calculate POS metrics
  const posKpis = useMemo(() => {
    const activeTodaySales = todaySales.filter((s) => s.status !== 'Refunded');
    const totalTodayRevenue = activeTodaySales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalTransactions = activeTodaySales.length;
    const avgTicket = totalTransactions > 0 ? Math.round(totalTodayRevenue / totalTransactions) : 0;

    // Inventory metrics
    let totalStockUnits = 0;
    let inventoryRetailValue = 0;
    let inventoryCostValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      totalStockUnits += p.stockQuantity;
      inventoryRetailValue += p.price.amount * p.stockQuantity;
      const cost = p.costPrice || p.cost?.amount || Math.round(p.price.amount * 0.6);
      inventoryCostValue += cost * p.stockQuantity;
      if (p.stockQuantity <= 0) {
        outOfStockCount++;
      } else if (p.stockQuantity <= (p.reorderLevel || 5)) {
        lowStockCount++;
      }
    });

    // Tender breakdown
    let cashVolume = 0;
    let cardVolume = 0;
    let baridiMobVolume = 0;
    let splitVolume = 0;

    activeTodaySales.forEach((s) => {
      if (s.paymentMethod === 'Cash') cashVolume += s.totalAmount;
      else if (s.paymentMethod === 'Card') cardVolume += s.totalAmount;
      else if (s.paymentMethod === 'BankTransfer' || (s.paymentMethod as string) === 'BaridiMob') baridiMobVolume += s.totalAmount;
      else if (s.paymentMethod === 'Split') splitVolume += s.totalAmount;
      else cashVolume += s.totalAmount;
    });

    const expectedCashInDrawer = 15000 + cashVolume;

    return {
      totalTodayRevenue,
      totalTransactions,
      avgTicket,
      totalStockUnits,
      inventoryRetailValue,
      inventoryCostValue,
      lowStockCount,
      outOfStockCount,
      cashVolume,
      cardVolume,
      baridiMobVolume,
      splitVolume,
      expectedCashInDrawer,
    };
  }, [todaySales, products]);

  // Top selling products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; units: number; revenue: number }>();
    branchSales.forEach((s) => {
      if (s.status === 'Refunded') return;
      s.items.forEach((it) => {
        const existing = map.get(it.productId) || { name: it.productName, units: 0, revenue: 0 };
        existing.units += it.quantity;
        existing.revenue += it.totalPrice;
        map.set(it.productId, existing);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4);
  }, [branchSales]);

  // Filtered sales for table
  const filteredSales = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return branchSales.filter((s) => {
      if (filterMode === 'today' && !s.createdAt.startsWith(today)) return false;
      if (filterMode === 'refunded' && s.status !== 'Refunded') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = s.id.toLowerCase().includes(q);
        const matchesCust = (s.memberName || '').toLowerCase().includes(q);
        const matchesPhone = (s.customerPhone || '').toLowerCase().includes(q);
        if (!matchesId && !matchesCust && !matchesPhone) return false;
      }
      return true;
    });
  }, [branchSales, filterMode, searchQuery]);

  // Sales Table Columns
  const salesColumns: ColumnDefinition<Sale>[] = useMemo(() => [
    {
      key: 'id',
      header: language === 'ar' ? 'رقم الوصل' : 'Ticket #',
      width: '140px',
      sortable: true,
      renderCell: (s) => (
        <div>
          <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white block">
            #{s.id.slice(-6).toUpperCase()}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono block">
            {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: language === 'ar' ? 'الزبون / العميل' : language === 'fr' ? 'Client' : 'Customer',
      minWidth: '170px',
      sortable: true,
      renderCell: (s) => (
        <div>
          <div className="font-bold text-xs text-neutral-900 dark:text-white truncate">
            {s.memberName || t('shop_receipt_walkin')}
          </div>
          {s.customerPhone && (
            <div className="text-[10px] text-neutral-400 font-mono truncate">
              {s.customerPhone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'items',
      header: language === 'ar' ? 'المحتويات' : language === 'fr' ? 'Articles' : 'Items',
      minWidth: '200px',
      renderCell: (s) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {s.items.slice(0, 2).map((it, idx) => (
            <span
              key={idx}
              className="text-[11px] text-neutral-600 dark:text-neutral-300 font-medium bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded"
            >
              {it.quantity}x {it.productName.split('(')[0].trim()}
            </span>
          ))}
          {s.items.length > 2 && (
            <span className="text-[10px] font-bold text-neutral-400">
              +{s.items.length - 2}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'tender',
      header: language === 'ar' ? 'طريقة الدفع' : language === 'fr' ? 'Règlement' : 'Tender',
      width: '130px',
      sortable: true,
      renderCell: (s) => {
        const isCash = s.paymentMethod === 'Cash';
        const isCard = s.paymentMethod === 'Card';
        const label =
          isCash
            ? language === 'ar' ? 'نقداً (DZD)' : 'Espèces (DZD)'
            : isCard
            ? 'CIB / Edahabia'
            : s.paymentMethod;

        return (
          <div className="flex items-center gap-1.5 text-xs">
            {isCash ? (
              <Banknote size={14} className="text-emerald-500 shrink-0" />
            ) : isCard ? (
              <CreditCard size={14} className="text-blue-500 shrink-0" />
            ) : (
              <Coins size={14} className="text-[#C4785A] shrink-0" />
            )}
            <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
              {label}
            </span>
          </div>
        );
      },
    },
    {
      key: 'total',
      header: language === 'ar' ? 'المبلغ الصافي' : language === 'fr' ? 'Total Payé' : 'Total Net',
      width: '140px',
      sortable: true,
      renderCell: (s) => (
        <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white tabular-nums">
          {formatMoney(s.totalAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: language === 'ar' ? 'الحالة' : 'Statut',
      width: '120px',
      sortable: true,
      renderCell: (s) => {
        const isRefunded = s.status === 'Refunded';
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isRefunded
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}
          >
            {isRefunded
              ? language === 'ar' ? 'مسترجع (Avoir)' : 'Remboursé'
              : language === 'ar' ? 'مسدد' : 'Encaissé'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '120px',
      renderCell: (s) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSaleForReceipt(s);
            }}
            className="h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-1 cursor-pointer transition-colors"
            title="Ticket Thermique 80mm"
          >
            <Printer size={13} className="text-[#C4785A]" />
            <span>{language === 'ar' ? 'وصل' : 'Reçu'}</span>
          </button>
          {s.status !== 'Refunded' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSaleForRefund(s);
              }}
              className="h-8 px-2 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
              title="Refund / Avoir"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      ),
    },
  ], [language, t]);

  const handleConfirmRefund = () => {
    if (!selectedSaleForRefund) return;
    refundSale(selectedSaleForRefund.id, refundReason);
    showToast({
      type: 'warning',
      title: language === 'ar' ? 'تم استرجاع الوصل بنجاح' : 'Vente Remboursée (Avoir)',
      message: `Vente #${selectedSaleForRefund.id.slice(-6).toUpperCase()} remboursée. Motif: ${refundReason}`,
      category: 'pos_inventory',
    });
    setSelectedSaleForRefund(null);
  };

  const handleExportSalesCSV = () => {
    const headers = ['Receipt #', 'Date & Time', 'Customer', 'Tender Method', 'Cashier', 'Subtotal (DA)', 'Discount (DA)', 'Total Paid (DA)', 'Status'];
    const rows = branchSales.map((s) => [
      `"#${s.id.slice(-8).toUpperCase()}"`,
      `"${new Date(s.createdAt).toLocaleString()}"`,
      `"${s.memberName || 'Walk-in'}"`,
      `"${s.paymentMethod}"`,
      `"${s.cashierName || 'Cashier Desk'}"`,
      s.subtotal || s.totalAmount,
      s.discountAmount || 0,
      s.totalAmount,
      `"${s.status || 'Completed'}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `POS_Sales_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Thermal Receipt Print Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #pos-thermal-receipt-container, #pos-thermal-receipt-container * {
            visibility: visible !important;
          }
          #pos-thermal-receipt-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 8px !important;
            font-size: 11px !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      {/* Outer Workspace Panel */}
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <ShoppingBag size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'لوحة قيادة المتجر والمبيعات' : language === 'fr' ? 'Tableau de Bord Caisse & Point de Vente' : 'Retail POS & Sales Command'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  {language === 'ar' ? 'الصندوق مفتوح' : 'Caisse Ouverte'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {language === 'ar'
                  ? 'مراقبة المبيعات الحية، رصيد الصندوق، المخزون الحرج، وإصدار وصلي 80 مم للزبائن'
                  : 'Flux d’encaissements en temps réel, réconciliation du tiroir-caisse, valorisation du stock et audit des tickets.'}
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
                  {currentBranch?.name || 'Magasin Principal'}
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
                    {language === 'ar' ? 'فروع ونقاط البيع' : 'Points de Vente & Magasins'}
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
              onClick={resetPosMockData}
              className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Recharger Démo POS"
            >
              <RefreshCw size={13} className="text-neutral-500" />
              <span>{language === 'ar' ? 'بيانات تجريبية' : 'Démo POS'}</span>
            </button>

            {/* Daily Z-Report Button */}
            <AtriumButton
              type="button"
              variant="outline"
              size="sm"
              icon={<FileText size={14} className="text-[#C4785A]" />}
              onClick={() => setIsZReportOpen(true)}
            >
              {language === 'ar' ? 'تقرير Z' : 'Rapport Z'}
            </AtriumButton>

            {/* Access Register */}
            <AtriumButton
              type="button"
              variant="primary"
              size="sm"
              icon={<Plus size={15} />}
              onClick={() => setScreen('shop')}
            >
              {language === 'ar' ? 'شاشة الصندوق (POS)' : 'Accéder à la Caisse'}
            </AtriumButton>
          </div>
        </div>

        {/* Top Metrics Pod Tray (SurfaceBgElevated: #F8F9FA, CornerRadius 24px) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: Today's Gross Revenue */}
            <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'مبيعات اليوم المحققة' : 'Chiffre d’Affaires du Jour'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  {posKpis.totalTransactions} tickets réglés
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {formatMoney(posKpis.totalTodayRevenue)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-1">
                  <Receipt size={13} className="text-[#C4785A]" />
                  <span>Panier Moyen: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{formatMoney(posKpis.avgTicket)}</strong></span>
                </div>
              </div>
            </div>

            {/* Card 2: Inventory Valuation & Stock Alerts */}
            <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'قيمة مخزون المتجر' : 'Valeur Stock en Magasin'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                  {posKpis.totalStockUnits} unités
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {formatMoney(posKpis.inventoryRetailValue)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-1">
                  {posKpis.lowStockCount > 0 ? (
                    <span className="text-rose-500 font-semibold flex items-center gap-1">
                      <AlertTriangle size={13} />
                      {posKpis.lowStockCount} article(s) en alerte réassort
                    </span>
                  ) : (
                    <span className="text-emerald-500 font-medium flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      Niveaux d'inventaire complets
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
            <div className="bg-[#1F1D1B] rounded-[18px] p-4 lg:p-5 border border-neutral-800 shadow-sm text-white flex flex-col justify-between relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#E7E5E4]">
                  {language === 'ar' ? 'رصيد درج النقود المتوقع' : 'Tiroir-Caisse & Espèces en Session'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">
                  Session Active
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">
                  {formatMoney(posKpis.expectedCashInDrawer)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-400 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Banknote size={12} className="text-[#FB923C]" />
                    <span>Fond 15k DA + {formatMoney(posKpis.cashVolume)} encaissés</span>
                  </span>
                  <span className="font-mono text-stone-300">DZD</span>
                </div>
              </div>

              {/* Decorative Subtle Background Sparkline */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FB923C]/5 rounded-full blur-2xl pointer-events-none" />
            </div>

          </div>
        </div>

        {/* Operational Pod Section: Payment Breakdown & Fast Access */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Payment Method Breakdown (7 cols) */}
          <div className="lg:col-span-7 bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  {language === 'ar' ? 'توزيع المقبوضات حسب وسيلة الدفع' : 'Répartition des Encaissements'}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  {language === 'ar' ? 'إجمالي المبالغ المحصلة في صندوق المحل اليوم' : 'Total ventilé par mode de paiement aujourd’hui'}
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-[#C4785A]">
                {formatMoney(posKpis.totalTodayRevenue)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Cash */}
              <div className="p-3.5 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-bold uppercase">
                  <Banknote size={13} className="text-emerald-500" />
                  <span>{language === 'ar' ? 'نقداً (Espèces)' : 'Espèces'}</span>
                </div>
                <div className="text-sm lg:text-base font-extrabold font-mono text-neutral-900 dark:text-white tabular-nums">
                  {formatMoney(posKpis.cashVolume)}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {posKpis.totalTodayRevenue > 0
                    ? `${Math.round((posKpis.cashVolume / posKpis.totalTodayRevenue) * 100)}% des ventes`
                    : '0%'}
                </div>
              </div>

              {/* Card */}
              <div className="p-3.5 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-bold uppercase">
                  <CreditCard size={13} className="text-blue-500" />
                  <span>CIB / Edahabia</span>
                </div>
                <div className="text-sm lg:text-base font-extrabold font-mono text-neutral-900 dark:text-white tabular-nums">
                  {formatMoney(posKpis.cardVolume)}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {posKpis.totalTodayRevenue > 0
                    ? `${Math.round((posKpis.cardVolume / posKpis.totalTodayRevenue) * 100)}% des ventes`
                    : '0%'}
                </div>
              </div>

              {/* BaridiMob & Transfers */}
              <div className="p-3.5 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-bold uppercase">
                  <Coins size={13} className="text-[#C4785A]" />
                  <span>BaridiMob / Mix</span>
                </div>
                <div className="text-sm lg:text-base font-extrabold font-mono text-neutral-900 dark:text-white tabular-nums">
                  {formatMoney(posKpis.baridiMobVolume + posKpis.splitVolume)}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {posKpis.totalTodayRevenue > 0
                    ? `${Math.round(((posKpis.baridiMobVolume + posKpis.splitVolume) / posKpis.totalTodayRevenue) * 100)}% des ventes`
                    : '0%'}
                </div>
              </div>
            </div>

            {/* Top Selling Products List */}
            <div className="pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                {language === 'ar' ? 'أكثر الأصناف مبيعاً' : 'Top Articles Vendus Aujourd’hui'}
              </span>
              <div className="space-y-1.5">
                {topProducts.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-[10px] font-mono font-bold flex items-center justify-center text-neutral-500 shrink-0">
                        0{idx + 1}
                      </span>
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 truncate">{item.name}</span>
                      <span className="text-[10px] text-neutral-400">({item.units} vendus)</span>
                    </div>
                    <span className="font-mono font-bold text-[#C4785A]">{formatMoney(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Parked Tickets & Quick Resume (5 cols) */}
          <div className="lg:col-span-5 bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                    {language === 'ar' ? 'التذاكر المعلقة (En Attente)' : 'Tickets en Attente'}
                  </h3>
                </div>
                <span className="font-mono text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                  {parkedOrders.length}
                </span>
              </div>

              {parkedOrders.length === 0 ? (
                <div className="p-6 rounded-2xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 text-center text-xs text-neutral-400">
                  {language === 'ar' ? 'لا توجد طلبات معلقة حالياً.' : 'Aucun ticket mis en pause.'}
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {parkedOrders.map((po) => (
                    <div
                      key={po.id}
                      className="p-3 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-between gap-3 text-xs shadow-2xs"
                    >
                      <div>
                        <div className="font-bold text-neutral-900 dark:text-white">
                          {po.referenceName}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {po.items.length} {language === 'ar' ? 'أصناف' : 'articles'} · {new Date(po.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#C4785A]">
                          {formatMoney(po.totalAmount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            resumeParkedOrder(po.id);
                            setScreen('shop');
                          }}
                          className="p-1.5 rounded-lg bg-[#C4785A] text-white hover:opacity-90 cursor-pointer"
                          title="Reprendre en caisse"
                        >
                          <PlayCircle size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setScreen('shop')}
              className="w-full py-2.5 rounded-xl bg-[#C4785A] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:opacity-95 shadow-xs transition-opacity mt-4"
            >
              <Plus size={14} />
              <span>{language === 'ar' ? 'فتح عملية بيع جديدة' : 'Nouvel Encaissement'}</span>
            </button>
          </div>
        </div>

        {/* Bottom Collection Pod Tray (SurfaceBgElevated: #F8F9FA) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          
          {/* Controls Bar: Segment Tabs + Seek Search + Export */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Segment Capsules */}
            <div className="flex items-center gap-1.5 bg-neutral-200/60 dark:bg-neutral-800 p-1 rounded-2xl self-start">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <span>{language === 'ar' ? 'جميع المبيعات' : 'Toutes les Ventes'}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  filterMode === 'all' ? 'bg-[#C4785A]/15 text-[#C4785A]' : 'bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500'
                }`}>
                  {branchSales.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('today')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  filterMode === 'today'
                    ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <span>{language === 'ar' ? 'مبيعات اليوم' : 'Aujourd’hui'}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  filterMode === 'today' ? 'bg-[#C4785A]/15 text-[#C4785A]' : 'bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500'
                }`}>
                  {todaySales.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('refunded')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  filterMode === 'refunded'
                    ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <span>{language === 'ar' ? 'المسترجعة' : 'Avoirs'}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  filterMode === 'refunded' ? 'bg-[#C4785A]/15 text-[#C4785A]' : 'bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500'
                }`}>
                  {branchSales.filter((s) => s.status === 'Refunded').length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={language === 'ar' ? 'بحث برقم الوصل، الزبون...' : 'Filtrer N° ticket, client...'}
                shutSize={36}
                openWidth={260}
              />
              <button
                type="button"
                onClick={handleExportSalesCSV}
                className="h-9 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 cursor-pointer transition-colors shadow-2xs"
              >
                <FileText size={13} />
                <span>{language === 'ar' ? 'تصدير' : 'Export CSV'}</span>
              </button>
            </div>
          </div>

          {/* Table Container Inside Pod Tray */}
          <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs overflow-hidden">
            <UniversalDataCollection<Sale>
              items={filteredSales}
              keyExtractor={(s) => s.id}
              defaultViewMode="list"
              columns={salesColumns}
              onItemClick={(s) => setSelectedSaleForReceipt(s)}
              renderCard={(s) => {
                const isRefunded = s.status === 'Refunded';
                return (
                  <div className="flex flex-col justify-between h-full space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white block">
                            #{s.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {new Date(s.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isRefunded ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {isRefunded ? 'Remboursé' : 'Encaissé'}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                        {s.memberName || 'Client de Passage'}
                      </div>

                      <div className="text-xs bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-xl space-y-0.5 text-neutral-600 dark:text-neutral-300">
                        {s.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[11px]">
                            <span>{it.quantity}x {it.productName}</span>
                            <span className="font-mono">{formatMoney(it.totalPrice)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <span className="font-mono font-black text-sm text-[#C4785A] tabular-nums">
                        {formatMoney(s.totalAmount)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSaleForReceipt(s);
                        }}
                        className="h-7 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer size={12} className="text-[#C4785A]" />
                        <span>Reçu</span>
                      </button>
                    </div>
                  </div>
                );
              }}
              selectedIds={selectedSaleIds}
              onSelectionChange={setSelectedSaleIds}
              isPinned={(s) => pinnedSaleIds.has(s.id)}
              onTogglePin={(s) => {
                setPinnedSaleIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(s.id)) next.delete(s.id);
                  else next.add(s.id);
                  return next;
                });
              }}
              emptyTitle={language === 'ar' ? 'لا توجد مبيعات مسجلة' : 'Aucune vente enregistrée'}
              emptyDescription={language === 'ar' ? 'قم بفتح شاشة الصندوق لبدء تسجيل العمليات' : 'Ouvrez la caisse enregistreuse pour débuter les encaissements.'}
              primaryActionLabel={language === 'ar' ? 'شاشة الصندوق' : 'Ouvrir Caisse'}
              onAddFirstItem={() => setScreen('shop')}
            />
          </div>

        </div>

      </div>

      {/* MODAL: Thermal Receipt Reprint Slip */}
      {selectedSaleForReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSaleForReceipt(null)}
          title={language === 'ar' ? 'معاينة وصل الدفع 80 مم' : 'Ticket de Caisse 80mm'}
          subtitle={`Ticket #${selectedSaleForReceipt.id.slice(-8).toUpperCase()}`}
        >
          <div className="space-y-4" dir="ltr">
            {/* Printable Thermal Receipt Slip Container */}
            <div
              id="pos-thermal-receipt-container"
              className="mx-auto max-w-[340px] bg-white text-black p-4 rounded-xl border border-neutral-300 font-mono text-[11px] leading-relaxed shadow-xs"
            >
              <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-neutral-400">
                <div className="text-sm font-black uppercase tracking-wider">
                  {receiptConfig.headerTitle || currentBranch.name}
                </div>
                {receiptConfig.subHeader && (
                  <div className="text-[10px] text-neutral-600">{receiptConfig.subHeader}</div>
                )}
                <div className="text-[9px] text-neutral-500">
                  {receiptConfig.address || currentBranch.address || '8 Rue Didouche Mourad, Alger'}
                </div>
                {receiptConfig.phone && (
                  <div className="text-[9px] text-neutral-500">Tel: {receiptConfig.phone}</div>
                )}
                {receiptConfig.taxId && (
                  <div className="text-[9px] font-bold text-neutral-600">NIF/RC: {receiptConfig.taxId}</div>
                )}
              </div>

              <div className="py-2 text-[10px] border-b border-dashed border-neutral-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>TICKET: #{selectedSaleForReceipt.id.slice(-8).toUpperCase()}</span>
                  <span>{new Date(selectedSaleForReceipt.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CAISSIER: {selectedSaleForReceipt.cashierName || currentUser?.fullName || 'Caissier'}</span>
                  <span>{new Date(selectedSaleForReceipt.createdAt).toLocaleTimeString()}</span>
                </div>
                {selectedSaleForReceipt.memberName && (
                  <div className="flex justify-between font-bold">
                    <span>CLIENT:</span>
                    <span>{selectedSaleForReceipt.memberName}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="py-2 space-y-1 border-b border-dashed border-neutral-400 text-[11px]">
                {selectedSaleForReceipt.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.productName}</span>
                    <span className="font-bold">{formatMoney(it.totalPrice)}</span>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="py-2 space-y-1 border-b border-dashed border-neutral-400">
                <div className="flex justify-between text-sm font-black pt-1">
                  <span>TOTAL PAYÉ</span>
                  <span>{formatMoney(selectedSaleForReceipt.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-600 pt-0.5">
                  <span>MODE DE PAIEMENT :</span>
                  <span className="font-bold">{selectedSaleForReceipt.paymentMethod}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 text-center space-y-1">
                {receiptConfig.showBarcode && (
                  <div className="w-36 h-6 mx-auto bg-neutral-900 text-white text-[7px] flex items-center justify-center tracking-widest">
                    |||| || ||||| || |||
                  </div>
                )}
                <div className="text-[10px] font-bold">
                  {receiptConfig.footerMessage || 'Merci pour votre visite !'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 h-10 px-4 text-xs font-bold text-white bg-[#C4785A] rounded-full cursor-pointer hover:opacity-90 flex items-center justify-center gap-2"
              >
                <Printer size={14} />
                <span>{language === 'ar' ? 'طباعة الوصل' : 'Imprimer Ticket 80mm'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSaleForReceipt(null)}
                className="h-10 px-4 text-xs font-semibold text-neutral-600 dark:text-neutral-300 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                {t('action_cancel')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Refund Confirmation */}
      {selectedSaleForRefund && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSaleForRefund(null)}
          title={language === 'ar' ? 'تأكيد استرجاع الوصل (Avoir)' : 'Confirmer le Remboursement (Avoir)'}
          subtitle={`Ticket #${selectedSaleForRefund.id.slice(-8).toUpperCase()} · ${formatMoney(selectedSaleForRefund.totalAmount)}`}
        >
          <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
            <p className="text-xs text-neutral-500">
              {language === 'ar'
                ? 'سيتم إعادة الأصناف تلقائياً إلى المخزون وتسجيل حركة إرجاع في سجل التدقيق.'
                : 'Les articles seront automatiquement réintégrés dans l’inventaire physique avec traçabilité complète.'}
            </p>

            <div>
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                {language === 'ar' ? 'سبب الإرجاع / الملاحظة' : 'Motif de retour / avoir'}
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSaleForRefund(null)}
                className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-xl hover:bg-neutral-100 cursor-pointer"
              >
                {t('action_cancel')}
              </button>
              <AtriumButton
                variant="danger"
                onClick={handleConfirmRefund}
                size="md"
              >
                {language === 'ar' ? 'تأكيد الاسترجاع' : 'Valider le Remboursement'}
              </AtriumButton>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: Daily Z-Report Closeout Preview */}
      {isZReportOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsZReportOpen(false)}
          title={language === 'ar' ? 'تقرير Z اليومي - إغلاق الصندوق' : 'Rapport Z · Clôture Journalière'}
          subtitle={`Session ${new Date().toISOString().split('T')[0]} · ${currentBranch.name}`}
        >
          <div className="space-y-4 font-mono text-xs leading-relaxed" dir="ltr">
            <div className="p-4 bg-white text-black rounded-xl border border-neutral-300 space-y-2">
              <div className="text-center font-bold pb-2 border-b border-dashed border-neutral-400">
                <div className="text-sm font-black uppercase">RAPPORT Z - CLÔTURE DE CAISSE</div>
                <div className="text-[10px] text-neutral-600">{currentBranch.name}</div>
                <div className="text-[10px] text-neutral-500">{new Date().toLocaleString()}</div>
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-neutral-400 text-[11px]">
                <div className="flex justify-between">
                  <span>COMMANDES RÉGLÉES :</span>
                  <span className="font-bold">{posKpis.totalTransactions}</span>
                </div>
                <div className="flex justify-between">
                  <span>CHIFFRE D’AFFAIRES BRUT :</span>
                  <span className="font-bold">{formatMoney(posKpis.totalTodayRevenue)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>PANIER MOYEN :</span>
                  <span>{formatMoney(posKpis.avgTicket)}</span>
                </div>
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-neutral-400 text-[11px]">
                <div className="font-bold text-[10px] text-neutral-500 uppercase">VENTILATION PAR TICKET :</div>
                <div className="flex justify-between">
                  <span>ESPÈCES :</span>
                  <span className="font-bold">{formatMoney(posKpis.cashVolume)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CARTE CIB / EDAHABIA :</span>
                  <span className="font-bold">{formatMoney(posKpis.cardVolume)}</span>
                </div>
                <div className="flex justify-between">
                  <span>BARIDIMOB / VIREMENT :</span>
                  <span className="font-bold">{formatMoney(posKpis.baridiMobVolume + posKpis.splitVolume)}</span>
                </div>
              </div>

              <div className="pt-1 text-[10px] text-center text-neutral-600">
                SIGNATURE CAISSIER / RESPONSABLE MAGASIN
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-10 px-4 rounded-full bg-[#C4785A] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90"
              >
                <Printer size={14} />
                <span>Imprimer Rapport Z</span>
              </button>
              <button
                type="button"
                onClick={() => setIsZReportOpen(false)}
                className="h-10 px-4 rounded-full text-neutral-500 hover:bg-neutral-100 text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
