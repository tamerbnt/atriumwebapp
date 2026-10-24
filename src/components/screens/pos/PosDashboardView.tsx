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
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { Sale, Product } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { Modal } from '../../ui/Modal';
import { AtriumButton } from '../../ui/AtriumButton';

export interface PosDashboardViewProps {
  onAddMember?: () => void;
  onOpenVoucherModal?: () => void;
}

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

    const potentialGrossMargin = Math.max(0, inventoryRetailValue - inventoryCostValue);

    // Tender breakdown
    let cashVolume = 0;
    let cardVolume = 0;
    let baridiMobVolume = 0;
    let splitVolume = 0;

    activeTodaySales.forEach((s) => {
      if (s.paymentMethod === 'Cash') cashVolume += s.totalAmount;
      else if (s.paymentMethod === 'Card') cardVolume += s.totalAmount;
      else if (s.paymentMethod === 'BankTransfer') baridiMobVolume += s.totalAmount;
      else if (s.paymentMethod === 'Split') {
        splitVolume += s.totalAmount;
        if (s.payments) {
          s.payments.forEach((p) => {
            if (p.method === 'Cash') cashVolume += p.amount;
            else if (p.method === 'Card') cardVolume += p.amount;
            else if (p.method === 'BankTransfer') baridiMobVolume += p.amount;
          });
        }
      }
    });

    return {
      totalTodayRevenue,
      totalTransactions,
      avgTicket,
      totalStockUnits,
      inventoryRetailValue,
      inventoryCostValue,
      potentialGrossMargin,
      lowStockCount,
      outOfStockCount,
      cashVolume,
      cardVolume,
      baridiMobVolume,
      splitVolume,
    };
  }, [todaySales, products]);

  // Top selling products from sales history
  const topProducts = useMemo(() => {
    const counter: Record<string, { product: Product | null; name: string; units: number; revenue: number }> = {};
    branchSales.forEach((sale) => {
      if (sale.status === 'Refunded') return;
      sale.items.forEach((item) => {
        const pId = item.productId;
        if (!counter[pId]) {
          const live = products.find((p) => p.id === pId) || null;
          counter[pId] = {
            product: live,
            name: item.productName,
            units: 0,
            revenue: 0,
          };
        }
        counter[pId].units += item.quantity;
        counter[pId].revenue += item.totalPrice;
      });
    });

    return Object.values(counter)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [branchSales, products]);

  // Columns for Recent Sales UniversalDataCollection
  const salesColumns: ColumnDefinition<Sale>[] = useMemo(() => [
    {
      key: 'id',
      header: language === 'ar' ? 'رقم الوصل' : language === 'fr' ? 'N° Ticket' : 'Receipt #',
      width: '1.4*',
      minWidth: '130px',
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
      width: '2*',
      minWidth: '150px',
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
      width: '2.5*',
      minWidth: '180px',
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
      width: '1.4*',
      minWidth: '120px',
      sortable: true,
      renderCell: (s) => {
        const isCash = s.paymentMethod === 'Cash';
        const isCard = s.paymentMethod === 'Card';
        const isSplit = s.paymentMethod === 'Split';
        const label =
          isCash
            ? language === 'ar' ? 'نقداً (DZD)' : 'Espèces (DZD)'
            : isCard
            ? 'CIB / Edahabia'
            : isSplit
            ? language === 'ar' ? 'مختلط' : 'Multi-Règlement'
            : 'BaridiMob / Virement';

        return (
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {label}
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: language === 'ar' ? 'المبلغ الإجمالي' : language === 'fr' ? 'Montant Total' : 'Amount Total',
      width: '1.6*',
      minWidth: '130px',
      sortable: true,
      renderCell: (s) => (
        <span className="font-mono font-black text-sm text-[#C4785A] tabular-nums">
          {formatMoney(s.totalAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: language === 'ar' ? 'الحالة' : language === 'fr' ? 'État' : 'Status',
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (s) => {
        const isRefunded = s.status === 'Refunded';
        return (
          <span
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isRefunded ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {isRefunded
              ? language === 'ar' ? 'مسترجع / Avoir' : 'Remboursé / Avoir'
              : language === 'ar' ? 'مسدد' : 'Encaissé'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '1.8*',
      minWidth: '140px',
      renderCell: (s) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSaleForReceipt(s);
            }}
            className="h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-[#C4785A] text-neutral-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title="Reprint 80mm receipt"
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
              className="h-8 px-2 rounded-lg text-neutral-400 hover:text-red-600 cursor-pointer transition-colors"
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
    <div className="space-y-6 pb-16" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Printable Receipt CSS */}
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

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <ShoppingBag className="text-[#C4785A]" size={26} />
              <span>
                {language === 'ar' ? 'لوحة قيادة المتجر والمبيعات' : language === 'fr' ? 'Tableau de Bord Caisse & Point de Vente' : 'Retail POS & Sales Command'}
              </span>
            </h1>
            <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              {language === 'ar' ? 'الصندوق مفتوح' : 'Caisse Ouverte'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {language === 'ar'
              ? 'مراقبة المبيعات الحية، رصيد الصندوق، المخزون الحرج، وإصدار وصلي 80 مم للزبائن'
              : 'Flux d’encaissements en temps réel, réconciliation du tiroir-caisse, valorisation du stock et audit des tickets.'}
          </p>
        </div>

        {/* Quick Actions & 1-Click Demo Recharge */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <AtriumButton
            type="button"
            variant="outline"
            size="sm"
            icon={<Sparkles size={14} className="text-[#C4785A]" />}
            onClick={resetPosMockData}
            title="Reload high-fidelity Algerian retail demo items and transactions"
          >
            {language === 'ar' ? 'إعادة شحن البيانات التجريبية' : 'Recharger Démo POS'}
          </AtriumButton>

          <AtriumButton
            type="button"
            variant="secondary"
            size="sm"
            icon={<FileText size={14} className="text-[#C4785A]" />}
            onClick={() => setIsZReportOpen(true)}
          >
            {language === 'ar' ? 'تقرير Z اليومي' : 'Rapport Z Clôture'}
          </AtriumButton>

          <AtriumButton
            type="button"
            variant="primary"
            size="sm"
            glow
            icon={<Plus size={15} />}
            onClick={() => setScreen('shop')}
          >
            {language === 'ar' ? 'فتح شاشة الصندوق (POS)' : 'Accéder à la Caisse'}
          </AtriumButton>
        </div>
      </div>

      {/* 4 Primary KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* KPI 1: Today's Revenue */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {language === 'ar' ? 'مبيعات اليوم' : language === 'fr' ? 'Chiffre d’Affaires du Jour' : 'Today’s Gross Revenue'}
            </span>
            <TrendingUp size={15} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-neutral-900 dark:text-white tabular-nums">
            {formatMoney(posKpis.totalTodayRevenue)}
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <span className="text-emerald-600 font-bold">{posKpis.totalTransactions}</span>
            <span>{language === 'ar' ? 'طلبات مسددة' : 'commandes réglées'}</span>
          </div>
        </div>

        {/* KPI 2: Average Ticket Size */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {language === 'ar' ? 'متوسط السلة' : language === 'fr' ? 'Panier Moyen' : 'Average Ticket Size'}
            </span>
            <Receipt size={15} className="text-[#C4785A]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#C4785A] tabular-nums">
            {formatMoney(posKpis.avgTicket)}
          </div>
          <div className="text-[11px] text-neutral-400">
            {language === 'ar' ? 'متوسط قيمة الوصل الواحد' : 'Valeur moyenne par encaissement'}
          </div>
        </div>

        {/* KPI 3: Inventory Retail Valuation */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {language === 'ar' ? 'قيمة المخزون الإجمالية' : language === 'fr' ? 'Valeur Stock en Magasin' : 'Stock Retail Valuation'}
            </span>
            <Package size={15} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-neutral-900 dark:text-white tabular-nums">
            {formatMoney(posKpis.inventoryRetailValue)}
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <span className="font-mono text-neutral-500 font-bold">{posKpis.totalStockUnits}</span>
            <span>{language === 'ar' ? 'وحدة فيزيائية متوفرة' : 'unités en stock'}</span>
          </div>
        </div>

        {/* KPI 4: Low Stock Warnings */}
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {language === 'ar' ? 'تنبيهات المخزون الحرج' : language === 'fr' ? 'Alertes Réassort & Rupture' : 'Restock / Depletion'}
            </span>
            <AlertTriangle size={15} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 tabular-nums flex items-center gap-2">
            <span>{posKpis.lowStockCount}</span>
            {posKpis.outOfStockCount > 0 && (
              <span className="text-xs text-red-500 font-bold">
                ({posKpis.outOfStockCount} {language === 'ar' ? 'نفد' : 'ruptures'})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setScreen('scheduler')}
            className="text-[11px] font-bold text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{language === 'ar' ? 'فتح جدول المخزون' : 'Gérer l’inventaire'}</span>
            <ArrowRight size={12} className={isRtl ? 'rotate-180' : ''} />
          </button>
        </div>
      </div>

      {/* Two Column Grid: Tender Breakdown & Fast Operational Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 cols: Payment Method Breakdown & Top Sellers */}
        <div className="lg:col-span-7 space-y-5">
          {/* Payment Method Distribution */}
          <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                  {language === 'ar' ? 'توزيع المقبوضات حسب وسيلة الدفع' : 'Répartition des Encaissements'}
                </h3>
                <p className="text-[11px] text-neutral-400">
                  {language === 'ar' ? 'إجمالي المبالغ المحصلة في صندوق المحل اليوم' : 'Total ventilé par mode de paiement aujourd’hui'}
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-neutral-500">
                {formatMoney(posKpis.totalTodayRevenue)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Cash */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 space-y-1">
                <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-bold uppercase">
                  <Banknote size={13} className="text-emerald-500" />
                  <span>{language === 'ar' ? 'نقداً (Espèces)' : 'Espèces'}</span>
                </div>
                <div className="text-base font-black font-mono text-neutral-900 dark:text-white tabular-nums">
                  {formatMoney(posKpis.cashVolume)}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {posKpis.totalTodayRevenue > 0
                    ? `${Math.round((posKpis.cashVolume / posKpis.totalTodayRevenue) * 100)}% des ventes`
                    : '0%'}
                </div>
              </div>

              {/* Card CIB / Edahabia */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 space-y-1">
                <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-bold uppercase">
                  <CreditCard size={13} className="text-blue-500" />
                  <span>CIB / Edahabia</span>
                </div>
                <div className="text-base font-black font-mono text-neutral-900 dark:text-white tabular-nums">
                  {formatMoney(posKpis.cardVolume)}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {posKpis.totalTodayRevenue > 0
                    ? `${Math.round((posKpis.cardVolume / posKpis.totalTodayRevenue) * 100)}% des ventes`
                    : '0%'}
                </div>
              </div>

              {/* BaridiMob & Transfers */}
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800 space-y-1">
                <div className="flex items-center gap-1.5 text-neutral-500 text-[10px] font-bold uppercase">
                  <Coins size={13} className="text-[#C4785A]" />
                  <span>BaridiMob / Mix</span>
                </div>
                <div className="text-base font-black font-mono text-neutral-900 dark:text-white tabular-nums">
                  {formatMoney(posKpis.baridiMobVolume + posKpis.splitVolume)}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {posKpis.totalTodayRevenue > 0
                    ? `${Math.round(((posKpis.baridiMobVolume + posKpis.splitVolume) / posKpis.totalTodayRevenue) * 100)}% des ventes`
                    : '0%'}
                </div>
              </div>
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                {language === 'ar' ? 'أكثر الأصناف مبيعاً' : 'Articles les Plus Vendus'}
              </h3>
              <button
                type="button"
                onClick={() => setScreen('scheduler')}
                className="text-xs font-bold text-[#C4785A] hover:underline cursor-pointer"
              >
                {language === 'ar' ? 'كامل الكتالوج' : 'Voir tout le catalogue'}
              </button>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {topProducts.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-400">
                  {language === 'ar' ? 'لا توجد بيانات مبيعات مسجلة حتى الآن.' : 'Aucune vente enregistrée pour le moment.'}
                </div>
              ) : (
                topProducts.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[10px] font-mono font-bold flex items-center justify-center text-neutral-500 shrink-0">
                        0{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-neutral-900 dark:text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {item.units} {language === 'ar' ? 'وحدة مباعة' : 'unités vendues'}
                        </div>
                      </div>
                    </div>
                    <div className={`font-mono font-bold text-[#C4785A] tabular-nums shrink-0 ${isRtl ? 'text-left' : 'text-right'}`}>
                      {formatMoney(item.revenue)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 5 cols: Cash Drawer & Parked Tickets Fast Access */}
        <div className="lg:col-span-5 space-y-5">
          {/* Cash Drawer Status Card */}
          <div className="p-5 rounded-3xl bg-neutral-900 text-white border border-neutral-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote size={18} className="text-[#C4785A]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-300">
                  {language === 'ar' ? 'حالة درج النقود (Tiroir-Caisse)' : 'Tiroir-Caisse & Session'}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full">
                {language === 'ar' ? 'نشط' : 'Actif'}
              </span>
            </div>

            <div className="space-y-2 py-1">
              <div className="flex justify-between text-xs text-neutral-400">
                <span>{language === 'ar' ? 'رصيد الفتح (Fond initial) :' : 'Fond de caisse initial :'}</span>
                <span className="font-mono text-white font-bold">15 000 DA</span>
              </div>
              <div className="flex justify-between text-xs text-neutral-400">
                <span>{language === 'ar' ? 'المقبوض نقداً اليوم :' : 'Espèces collectées aujourd’hui :'}</span>
                <span className="font-mono text-emerald-400 font-bold">+{formatMoney(posKpis.cashVolume)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-neutral-800 text-sm font-black">
                <span>{language === 'ar' ? 'المبلغ التقديري بالدرج :' : 'Espèces attendues en caisse :'}</span>
                <span className="font-mono text-xl text-[#C4785A] tabular-nums">
                  {formatMoney(15000 + posKpis.cashVolume)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setScreen('finance')}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <span>{language === 'ar' ? 'إجراء الجرد والتسوية المالية' : 'Gérer la Caisse & Dépenses'}</span>
              <ArrowRight size={13} className={isRtl ? 'rotate-180' : ''} />
            </button>
          </div>

          {/* Parked / Held Tickets Card */}
          <div className="p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                  {language === 'ar' ? 'التذاكر المعلقة (En Attente)' : 'Tickets en Attente'}
                </h3>
              </div>
              <span className="font-mono text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full">
                {parkedOrders.length}
              </span>
            </div>

            {parkedOrders.length === 0 ? (
              <p className="text-xs text-neutral-400 py-3 text-center">
                {language === 'ar' ? 'لا توجد طلبات معلقة حالياً.' : 'Aucun ticket mis en pause.'}
              </p>
            ) : (
              <div className="space-y-2">
                {parkedOrders.slice(0, 3).map((po) => (
                  <div
                    key={po.id}
                    className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3 text-xs"
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
                        title="Resume in register"
                      >
                        <PlayCircle size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sales Ledger via UniversalDataCollection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-neutral-900 dark:text-white">
              {language === 'ar' ? 'سجل العمليات والوصولات الأخيرة' : 'Journal Récent des Ventes'}
            </h2>
            <p className="text-xs text-neutral-500">
              {language === 'ar' ? 'جميع مبيعات نقطة البيع المسجلة في هذا الفرع' : 'Historique des encaissements horodatés avec réimpression thermique 80mm.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportSalesCSV}
              className="h-9 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
            >
              <FileText size={13} />
              <span>{language === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        <UniversalDataCollection<Sale>
          items={branchSales}
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
                        isRefunded ? 'text-red-600' : 'text-emerald-600'
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
