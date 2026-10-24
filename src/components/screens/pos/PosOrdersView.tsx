import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Receipt,
  PauseCircle,
  PlayCircle,
  Trash2,
  Printer,
  RotateCcw,
  Download,
  Calendar,
  Filter,
  CreditCard,
  Banknote,
  Search,
  CheckCircle2,
  Coins,
  Sparkles,
  ArrowRight,
  Package,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { Sale, ParkedOrder } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { AtriumButton } from '../../ui/AtriumButton';
import { Seek } from '../../ui/Seek';
import { Modal } from '../../ui/Modal';
import { FilterSelect } from '../../ui/FilterSelect';
import { LabelInput } from '../../ui/LabelInput';

export const PosOrdersView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    sales,
    parkedOrders,
    currentBranch,
    setScreen,
    resumeParkedOrder,
    deleteParkedOrder,
    refundSale,
    receiptConfig,
    currentUser,
    resetPosMockData,
  } = useAtriumStore();

  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'parked'>('sales');

  // Sales Filters
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | 'month'>('all');
  const [tenderFilter, setTenderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'refunded'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection & Pinning
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());
  const [pinnedSaleIds, setPinnedSaleIds] = useState<Set<string>>(new Set());
  const [selectedParkedIds, setSelectedParkedIds] = useState<Set<string>>(new Set());
  const [pinnedParkedIds, setPinnedParkedIds] = useState<Set<string>>(new Set());

  // Sorting
  const [salesSortBy, setSalesSortBy] = useState<string>('date');
  const [salesSortDir, setSalesSortDir] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [selectedSaleForRefund, setSelectedSaleForRefund] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState('Customer Request / Avoir');

  // Filter sales for branch
  const branchSales = useMemo(() => {
    return sales.filter(
      (s) => s.facilityId === currentBranch.id || s.id.startsWith('sale_pos_')
    );
  }, [sales, currentBranch.id]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    const now = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];

    return branchSales.filter((s) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = s.id.toLowerCase().includes(q);
        const matchesMember = (s.memberName || '').toLowerCase().includes(q);
        const matchesPhone = (s.customerPhone || '').toLowerCase().includes(q);
        const matchesItems = s.items.some((it) => it.productName.toLowerCase().includes(q));
        if (!matchesId && !matchesMember && !matchesPhone && !matchesItems) return false;
      }

      // Date filter
      if (dateFilter === 'today') {
        if (!s.createdAt.startsWith(todayStr)) return false;
      } else if (dateFilter === '7days') {
        const saleTime = new Date(s.createdAt).getTime();
        if (now - saleTime > 7 * 86400000) return false;
      } else if (dateFilter === 'month') {
        const saleTime = new Date(s.createdAt).getTime();
        if (now - saleTime > 30 * 86400000) return false;
      }

      // Tender filter
      if (tenderFilter !== 'all') {
        if (s.paymentMethod !== tenderFilter) return false;
      }

      // Status filter
      if (statusFilter === 'completed' && s.status === 'Refunded') return false;
      if (statusFilter === 'refunded' && s.status !== 'Refunded') return false;

      return true;
    });
  }, [branchSales, dateFilter, tenderFilter, statusFilter, searchQuery]);

  // Sorted sales with pinning
  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      const aPinned = pinnedSaleIds.has(a.id);
      const bPinned = pinnedSaleIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (salesSortBy === 'date') {
        const cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return salesSortDir === 'asc' ? cmp : -cmp;
      }
      if (salesSortBy === 'amount') {
        const cmp = a.totalAmount - b.totalAmount;
        return salesSortDir === 'asc' ? cmp : -cmp;
      }
      if (salesSortBy === 'customer') {
        const nameA = a.memberName || '';
        const nameB = b.memberName || '';
        const cmp = nameA.localeCompare(nameB);
        return salesSortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredSales, pinnedSaleIds, salesSortBy, salesSortDir]);

  // Sales KPIs
  const salesKpis = useMemo(() => {
    let totalGross = 0;
    let totalRefunded = 0;
    let completedCount = 0;

    branchSales.forEach((s) => {
      if (s.status === 'Refunded') {
        totalRefunded += s.totalAmount;
      } else {
        totalGross += s.totalAmount;
        completedCount++;
      }
    });

    const netRevenue = Math.max(0, totalGross - totalRefunded);

    return {
      totalGross,
      totalRefunded,
      completedCount,
      netRevenue,
    };
  }, [branchSales]);

  // Columns for Sales Ledger UniversalDataCollection
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
      key: 'date',
      header: language === 'ar' ? 'التاريخ' : language === 'fr' ? 'Date' : 'Date',
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (s) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-300 font-mono">
          {new Date(s.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'customer',
      header: language === 'ar' ? 'الزبون' : language === 'fr' ? 'Client' : 'Customer',
      width: '2*',
      minWidth: '150px',
      sortable: true,
      renderCell: (s) => (
        <div>
          <div className="font-bold text-xs text-neutral-900 dark:text-white truncate">
            {s.memberName || t('shop_receipt_walkin')}
          </div>
          {s.customerPhone && (
            <div className="text-[10px] text-neutral-400 font-mono">
              {s.customerPhone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'items',
      header: language === 'ar' ? 'الأصناف' : language === 'fr' ? 'Détail Articles' : 'Items',
      width: '2.5*',
      minWidth: '180px',
      renderCell: (s) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {s.items.slice(0, 2).map((it, idx) => (
            <span
              key={idx}
              className="text-[10px] text-neutral-600 dark:text-neutral-300 font-medium bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded"
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
            ? 'Espèces'
            : isCard
            ? 'CIB / Edahabia'
            : isSplit
            ? 'Split Mixte'
            : 'BaridiMob';

        return (
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {label}
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: language === 'ar' ? 'المبلغ' : language === 'fr' ? 'Total Payé' : 'Total Paid',
      width: '1.5*',
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
      header: language === 'ar' ? 'الحالة' : language === 'fr' ? 'Statut' : 'Status',
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
              ? language === 'ar' ? 'مسترجع (Avoir)' : 'Remboursé (Avoir)'
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
            <span>Reçu</span>
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

  // Columns for Parked Orders UniversalDataCollection
  const parkedColumns: ColumnDefinition<ParkedOrder>[] = useMemo(() => [
    {
      key: 'ref',
      header: language === 'ar' ? 'مرجع التذكرة' : language === 'fr' ? 'Réf Ticket' : 'Ticket Ref',
      width: '2*',
      minWidth: '160px',
      sortable: true,
      renderCell: (po) => (
        <div>
          <span className="font-bold text-xs text-neutral-900 dark:text-white block">
            {po.referenceName}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono block">
            {new Date(po.createdAt).toLocaleTimeString()}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: language === 'ar' ? 'العميل' : language === 'fr' ? 'Client' : 'Customer',
      width: '2*',
      minWidth: '140px',
      renderCell: (po) => (
        <div>
          <div className="font-bold text-xs text-neutral-800 dark:text-neutral-200 truncate">
            {po.customerName || t('shop_receipt_walkin')}
          </div>
          {po.customerPhone && (
            <div className="text-[10px] text-neutral-400 font-mono">
              {po.customerPhone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'items',
      header: language === 'ar' ? 'الأصناف' : language === 'fr' ? 'Articles' : 'Items',
      width: '3*',
      minWidth: '200px',
      renderCell: (po) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {po.items.slice(0, 3).map((it, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] font-medium text-neutral-700 dark:text-neutral-300"
            >
              {it.quantity}x {it.productName}
            </span>
          ))}
          {po.items.length > 3 && (
            <span className="text-[10px] font-bold text-neutral-400">
              +{po.items.length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'total',
      header: language === 'ar' ? 'المجموع' : language === 'fr' ? 'Total' : 'Total Due',
      width: '1.6*',
      minWidth: '130px',
      sortable: true,
      renderCell: (po) => (
        <span className="font-mono font-black text-sm text-[#C4785A] tabular-nums">
          {formatMoney(po.totalAmount)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '2*',
      minWidth: '150px',
      renderCell: (po) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resumeParkedOrder(po.id);
              setScreen('shop');
            }}
            className="h-8 px-3 rounded-xl bg-[#C4785A] text-white text-xs font-bold flex items-center gap-1 hover:opacity-90 cursor-pointer"
          >
            <PlayCircle size={13} />
            <span>{language === 'ar' ? 'استئناف' : 'Reprendre'}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteParkedOrder(po.id);
            }}
            className="h-8 px-2 rounded-xl text-neutral-400 hover:text-red-500 cursor-pointer"
            title="Discard held order"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [language, t, setScreen, resumeParkedOrder, deleteParkedOrder]);

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

  const handleExportCSV = () => {
    const headers = ['Receipt #', 'Date & Time', 'Customer', 'Tender Method', 'Cashier', 'Subtotal (DA)', 'Discount (DA)', 'Total Paid (DA)', 'Status'];
    const rows = filteredSales.map((s) => [
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
    link.setAttribute('download', `Sales_Ledger_${currentBranch.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Print stylesheet for 80mm slip */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #pos-orders-thermal-receipt, #pos-orders-thermal-receipt * {
            visibility: visible !important;
          }
          #pos-orders-thermal-receipt {
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
              <ClipboardList className="text-[#C4785A]" size={26} />
              <span>
                {language === 'ar' ? 'سجل الطلبات والمبيعات' : language === 'fr' ? 'Commandes & Tickets de Caisse' : 'Sales Ledger & Orders'}
              </span>
            </h1>
            <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              {branchSales.length} {language === 'ar' ? 'عملية مسجلة' : 'ventes'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {language === 'ar'
              ? 'متابعة سجل المبيعات المكتملة، التذاكر المعلقة، إصدار فواتير الإرجاع، والطباعة الحرارية 80 مم'
              : 'Audit des encaissements, tickets en attente, traitement des avoirs et réimpression des reçus thermiques.'}
          </p>
        </div>

        {/* Subtab Segmented Switcher & Export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={resetPosMockData}
            className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-2 cursor-pointer shadow-2xs transition-colors"
            title="Reload mock sales & tickets"
          >
            <Sparkles size={14} className="text-[#C4785A]" />
            <span>{language === 'ar' ? 'شحن العينة' : 'Démo Recharge'}</span>
          </button>

          <AtriumButton
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download size={14} />}
          >
            {language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
          </AtriumButton>

          <AtriumButton
            variant="primary"
            size="sm"
            onClick={() => setScreen('shop')}
            icon={<Receipt size={14} />}
          >
            {language === 'ar' ? 'نقطة البيع' : 'Caisse'}
          </AtriumButton>
        </div>
      </div>

      {/* Segmented Subtabs: Completed Sales Ledger vs Parked Tickets */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('sales')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'sales'
              ? 'bg-[#C4785A] text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <Receipt size={15} />
          <span>{language === 'ar' ? 'المبيعات المسددة' : 'Encaissements Terminés'}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            activeSubTab === 'sales' ? 'bg-white text-[#C4785A]' : 'bg-neutral-200 dark:bg-neutral-700'
          }`}>
            {branchSales.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('parked')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'parked'
              ? 'bg-[#C4785A] text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
        >
          <PauseCircle size={15} />
          <span>{language === 'ar' ? 'التذاكر المعلقة' : 'Tickets en Attente'}</span>
          {parkedOrders.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              activeSubTab === 'parked' ? 'bg-white text-[#C4785A]' : 'bg-amber-100 text-amber-800'
            }`}>
              {parkedOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: COMPLETED SALES LEDGER                                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'sales' && (
        <div className="space-y-5">
          {/* Sales KPIs Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {language === 'ar' ? 'إجمالي المبيعات' : 'Volume Brut des Ventes'}
              </div>
              <div className="text-xl font-black font-mono text-neutral-900 dark:text-white tabular-nums">
                {formatMoney(salesKpis.totalGross)}
              </div>
              <div className="text-[10px] text-neutral-400">
                {salesKpis.completedCount} {language === 'ar' ? 'عملية سداد' : 'tickets clôturés'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {language === 'ar' ? 'صافي الإيرادات' : 'Chiffre d’Affaires Net'}
              </div>
              <div className="text-xl font-black font-mono text-[#C4785A] tabular-nums">
                {formatMoney(salesKpis.netRevenue)}
              </div>
              <div className="text-[10px] text-neutral-400">
                {language === 'ar' ? 'بعد خصم المرتجعات' : 'Déduction faite des avoirs'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {language === 'ar' ? 'المرتجعات (Avoirs)' : 'Avoirs & Remboursements'}
              </div>
              <div className="text-xl font-black font-mono text-red-600 dark:text-red-400 tabular-nums">
                {formatMoney(salesKpis.totalRefunded)}
              </div>
              <div className="text-[10px] text-neutral-400">
                {language === 'ar' ? 'المبالغ المسترجعة للزبائن' : 'Articles réintégrés en stock'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {language === 'ar' ? 'متوسط الوصل' : 'Panier Moyen Global'}
              </div>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {salesKpis.completedCount > 0 ? formatMoney(Math.round(salesKpis.netRevenue / salesKpis.completedCount)) : '0 DA'}
              </div>
              <div className="text-[10px] text-neutral-400">
                {language === 'ar' ? 'معدل سلة الزبون' : 'Ticket moyen par transaction'}
              </div>
            </div>
          </div>

          {/* Interactive Filters Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Filter Tabs */}
              <div className="flex items-center p-0.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDateFilter('all')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    dateFilter === 'all' ? 'bg-[#C4785A] text-white' : 'text-neutral-500'
                  }`}
                >
                  {language === 'ar' ? 'الكل' : 'Tous'}
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('today')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    dateFilter === 'today' ? 'bg-[#C4785A] text-white' : 'text-neutral-500'
                  }`}
                >
                  {language === 'ar' ? 'اليوم' : 'Aujourd’hui'}
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('7days')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    dateFilter === '7days' ? 'bg-[#C4785A] text-white' : 'text-neutral-500'
                  }`}
                >
                  {language === 'ar' ? '7 أيام' : '7 jours'}
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('month')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${
                    dateFilter === 'month' ? 'bg-[#C4785A] text-white' : 'text-neutral-500'
                  }`}
                >
                  {language === 'ar' ? 'هذا الشهر' : 'Ce mois'}
                </button>
              </div>

              {/* Tender Filter */}
              <FilterSelect
                label={language === 'ar' ? 'وسيلة الدفع' : 'Règlement'}
                value={tenderFilter}
                onChange={(val) => setTenderFilter(typeof val === 'string' ? val : val.target?.value || val)}
                options={[
                  { value: 'all', label: language === 'ar' ? 'جميع الوسائل' : 'Toutes les méthodes' },
                  { value: 'Cash', label: 'Espèces' },
                  { value: 'Card', label: 'CIB / Edahabia' },
                  { value: 'BankTransfer', label: 'BaridiMob' },
                  { value: 'Split', label: 'Split' },
                ]}
              />

              {/* Status Filter */}
              <FilterSelect
                label={language === 'ar' ? 'الحالة' : 'Statut'}
                value={statusFilter}
                onChange={(val) => setStatusFilter((typeof val === 'string' ? val : val.target?.value || val) as any)}
                options={[
                  { value: 'all', label: language === 'ar' ? 'جميع الحالات' : 'Tous les statuts' },
                  { value: 'completed', label: language === 'ar' ? 'مسدد' : 'Encaissé' },
                  { value: 'refunded', label: language === 'ar' ? 'مسترجع (Avoir)' : 'Remboursé' },
                ]}
              />

              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={language === 'ar' ? 'بحث برقم الوصل، الزبون، المادة...' : 'Rechercher ticket, client, produit...'}
              />
            </div>
          </div>

          {/* Universal Sales Ledger Collection */}
          <UniversalDataCollection<Sale>
            items={sortedSales}
            keyExtractor={(s) => s.id}
            defaultViewMode="list"
            columns={salesColumns}
            sortBy={salesSortBy}
            sortDirection={salesSortDir}
            onSortChange={(key) => {
              if (salesSortBy === key) {
                setSalesSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setSalesSortBy(key);
                setSalesSortDir('asc');
              }
            }}
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
                        {isRefunded ? 'Avoir' : 'Encaissé'}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                      {s.memberName || 'Client Walk-in'}
                    </div>

                    <div className="text-xs bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-xl space-y-1 text-neutral-600 dark:text-neutral-300">
                      {s.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span>{it.quantity}x {it.productName}</span>
                          <span className="font-mono font-bold">{formatMoney(it.totalPrice)}</span>
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
                      className="h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
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
            emptyTitle={language === 'ar' ? 'لا توجد مبيعات مطابقة' : 'Aucune vente correspondante'}
            emptyDescription={language === 'ar' ? 'جرب تغيير معايير البحث أو الفترة الزمنية' : 'Modifiez vos filtres ou effectuez un encaissement sur la caisse.'}
            primaryActionLabel={language === 'ar' ? 'فتح شاشة الصندوق' : 'Ouvrir Caisse'}
            onAddFirstItem={() => setScreen('shop')}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: PARKED / HELD ORDERS                                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'parked' && (
        <div className="space-y-4">
          <UniversalDataCollection<ParkedOrder>
            items={parkedOrders}
            keyExtractor={(po) => po.id}
            defaultViewMode="grid"
            columns={parkedColumns}
            onItemClick={(po) => {
              resumeParkedOrder(po.id);
              setScreen('shop');
            }}
            renderCard={(po) => (
              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-xs font-black text-neutral-900 dark:text-white">
                        {po.referenceName}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {new Date(po.createdAt).toLocaleTimeString()} · {po.items.length} {language === 'ar' ? 'أصناف' : 'articles'}
                      </div>
                    </div>
                    <div className="text-sm font-black font-mono text-[#C4785A]">
                      {formatMoney(po.totalAmount)}
                    </div>
                  </div>

                  <div className="text-xs bg-neutral-50 dark:bg-neutral-800/50 p-2.5 rounded-xl space-y-1">
                    {po.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-300">
                        <span>{it.quantity}x {it.productName}</span>
                        <span className="font-mono">{formatMoney(it.totalPrice)}</span>
                      </div>
                    ))}
                  </div>

                  {po.notes && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 italic mt-2">
                      Note : {po.notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      resumeParkedOrder(po.id);
                      setScreen('shop');
                    }}
                    className="flex-1 h-9 rounded-xl bg-[#C4785A] text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 cursor-pointer"
                  >
                    <PlayCircle size={14} />
                    <span>{language === 'ar' ? 'استئناف في الصندوق' : 'Reprendre en Caisse'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteParkedOrder(po.id);
                    }}
                    className="h-9 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:text-red-500 cursor-pointer"
                    title="Discard order"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
            selectedIds={selectedParkedIds}
            onSelectionChange={setSelectedParkedIds}
            isPinned={(po) => pinnedParkedIds.has(po.id)}
            onTogglePin={(po) => {
              setPinnedParkedIds((prev) => {
                const next = new Set(prev);
                if (next.has(po.id)) next.delete(po.id);
                else next.add(po.id);
                return next;
              });
            }}
            emptyTitle={language === 'ar' ? 'لا توجد طلبات معلقة' : 'Aucun ticket en pause'}
            emptyDescription={language === 'ar' ? 'يمكنك تعليق أي طلب من شاشة الصندوق لخدمة زبون آخر مؤقتاً' : 'Mettez un panier en pause depuis la caisse enregistreuse pour libérer le terminal.'}
            primaryActionLabel={language === 'ar' ? 'شاشة الصندوق' : 'Accéder à la Caisse'}
            onAddFirstItem={() => setScreen('shop')}
          />
        </div>
      )}

      {/* MODAL: Thermal Receipt Reprint Slip */}
      {selectedSaleForReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSaleForReceipt(null)}
          title={language === 'ar' ? 'معاينة وصل الدفع 80 مم' : 'Ticket de Caisse 80mm'}
          subtitle={`Ticket #${selectedSaleForReceipt.id.slice(-8).toUpperCase()}`}
        >
          <div className="space-y-4" dir="ltr">
            <div
              id="pos-orders-thermal-receipt"
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

            <LabelInput
              label={language === 'ar' ? 'سبب الإرجاع / الملاحظة' : 'Motif de retour / avoir'}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Ex: Erreur de saisie, produit défectueux..."
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <AtriumButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSaleForRefund(null)}
              >
                {t('action_cancel')}
              </AtriumButton>
              <AtriumButton
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmRefund}
              >
                {language === 'ar' ? 'تأكيد الاسترجاع' : 'Valider le Remboursement'}
              </AtriumButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
