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
  Home,
  ChevronDown,
  RefreshCw,
  TrendingUp,
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
    branches,
    switchBranch,
    setScreen,
    resumeParkedOrder,
    deleteParkedOrder,
    refundSale,
    receiptConfig,
    currentUser,
    resetPosMockData,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'parked'>('sales');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

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

  // Modal State
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [selectedSaleForRefund, setSelectedSaleForRefund] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState('Demande Client / Avoir');

  // Filter sales for branch
  const branchSales = useMemo(() => {
    return sales.filter(
      (s) => s.facilityId === currentBranch.id || s.id.startsWith('sale_pos_')
    );
  }, [sales, currentBranch.id]);

  // Aggregate stats
  const salesKpis = useMemo(() => {
    let totalGross = 0;
    let totalRefunded = 0;
    let completedCount = 0;
    let refundedCount = 0;

    branchSales.forEach((s) => {
      if (s.status === 'Refunded') {
        totalRefunded += s.totalAmount;
        refundedCount++;
      } else {
        totalGross += s.totalAmount;
        completedCount++;
      }
    });

    const netRevenue = Math.max(0, totalGross - totalRefunded);

    return {
      totalGross,
      totalRefunded,
      netRevenue,
      completedCount,
      refundedCount,
    };
  }, [branchSales]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    return branchSales.filter((s) => {
      // Date filter
      if (dateFilter === 'today' && !s.createdAt.startsWith(todayStr)) return false;
      if (dateFilter === '7days' && s.createdAt < sevenDaysAgo) return false;
      if (dateFilter === 'month' && s.createdAt < monthStart) return false;

      // Tender filter
      if (tenderFilter !== 'all' && s.paymentMethod !== tenderFilter) return false;

      // Status filter
      if (statusFilter === 'completed' && s.status === 'Refunded') return false;
      if (statusFilter === 'refunded' && s.status !== 'Refunded') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = s.id.toLowerCase().includes(q);
        const matchesName = (s.memberName || '').toLowerCase().includes(q);
        const matchesPhone = (s.customerPhone || '').toLowerCase().includes(q);
        const matchesCashier = (s.cashierName || '').toLowerCase().includes(q);
        const matchesItem = s.items.some((it) => it.productName.toLowerCase().includes(q));
        if (!matchesId && !matchesName && !matchesPhone && !matchesCashier && !matchesItem) {
          return false;
        }
      }

      return true;
    });
  }, [branchSales, dateFilter, tenderFilter, statusFilter, searchQuery]);

  // Filtered parked orders
  const filteredParkedOrders = useMemo(() => {
    return parkedOrders.filter((po) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = po.id.toLowerCase().includes(q);
        const matchesRef = po.referenceName.toLowerCase().includes(q);
        const matchesCashier = ((po as any).cashierName || '').toLowerCase().includes(q);
        if (!matchesId && !matchesRef && !matchesCashier) return false;
      }
      return true;
    });
  }, [parkedOrders, searchQuery]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Receipt #', 'Date & Time', 'Customer', 'Phone', 'Payment Method', 'Cashier', 'Subtotal (DA)', 'Total (DA)', 'Status'];
    const rows = filteredSales.map((s) => [
      `"#${s.id.slice(-8).toUpperCase()}"`,
      `"${new Date(s.createdAt).toLocaleString()}"`,
      `"${s.memberName || 'Client de passage'}"`,
      `"${s.customerPhone || ''}"`,
      `"${s.paymentMethod}"`,
      `"${s.cashierName || 'Caisse'}"`,
      s.subtotal || s.totalAmount,
      s.totalAmount,
      `"${s.status || 'Completed'}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `POS_Sales_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sales Columns
  const salesColumns: ColumnDefinition<Sale>[] = useMemo(() => [
    {
      key: 'id',
      header: language === 'ar' ? 'رقم الوصل' : 'N° Ticket',
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
      width: '140px',
      sortable: true,
      renderCell: (s) => {
        const isCash = s.paymentMethod === 'Cash';
        const isCard = s.paymentMethod === 'Card';
        const label =
          isCash
            ? language === 'ar' ? 'نقداً (DZD)' : 'Espèces'
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

  // Parked Orders Columns
  const parkedColumns: ColumnDefinition<ParkedOrder>[] = useMemo(() => [
    {
      key: 'reference',
      header: language === 'ar' ? 'اسم التذكرة المعلقة' : 'Référence / Table / Client',
      minWidth: '200px',
      sortable: true,
      renderCell: (po) => (
        <div>
          <span className="font-bold text-xs text-neutral-900 dark:text-white block">
            {po.referenceName}
          </span>
          <span className="text-[10px] text-neutral-400 font-mono">
            {new Date(po.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {((po as any).cashierName || 'Caisse')}
          </span>
        </div>
      ),
    },
    {
      key: 'items',
      header: language === 'ar' ? 'المحتويات' : 'Articles en Pause',
      minWidth: '220px',
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
      header: language === 'ar' ? 'المجموع' : 'Total Dû',
      width: '140px',
      sortable: true,
      renderCell: (po) => (
        <span className="font-mono font-bold text-xs text-[#C4785A] tabular-nums">
          {formatMoney(po.totalAmount)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '160px',
      renderCell: (po) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              resumeParkedOrder(po.id);
              setScreen('shop');
            }}
            className="h-8 px-3 rounded-xl bg-[#C4785A] text-white text-xs font-bold flex items-center gap-1 hover:opacity-90 cursor-pointer shadow-xs"
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
            className="h-8 px-2 rounded-xl text-neutral-400 hover:text-rose-500 cursor-pointer"
            title="Supprimer le ticket"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ], [language, setScreen, resumeParkedOrder, deleteParkedOrder]);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
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

            <div className="space-y-6">
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <ClipboardList size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'سجل الطلبات والمبيعات' : language === 'fr' ? 'Commandes & Tickets de Caisse' : 'Sales Ledger & Orders'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C4785A]/15 text-[#C4785A] border border-[#C4785A]/30">
                  {branchSales.length} {language === 'ar' ? 'عملية مسجلة' : 'ventes'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {language === 'ar'
                  ? 'متابعة سجل المبيعات المكتملة، التذاكر المعلقة، إصدار فواتير الإرجاع، والطباعة الحرارية 80 مم'
                  : 'Audit des encaissements, tickets en attente, traitement des avoirs et réimpression des reçus thermiques.'}
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
              <span>{language === 'ar' ? 'شحن العينة' : 'Démo Recharge'}</span>
            </button>

            {/* CSV Export */}
            <AtriumButton
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              icon={<Download size={14} className="text-[#C4785A]" />}
            >
              {language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
            </AtriumButton>

            {/* Access Register */}
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

        {/* Top Metrics Pod Tray (SurfaceBgElevated: #F8F9FA, CornerRadius 24px) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: Volume Brut des Ventes */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'إجمالي المبيعات الإجمالي' : 'Volume Brut des Ventes'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  {salesKpis.completedCount} tickets
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {formatMoney(salesKpis.totalGross)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                  <Receipt size={13} className="text-[#C4785A]" />
                  <span>Ticket moyen: <strong className="font-mono text-neutral-800 dark:text-neutral-200">{salesKpis.completedCount > 0 ? formatMoney(Math.round(salesKpis.totalGross / salesKpis.completedCount)) : '0 DA'}</strong></span>
                </div>
              </div>
            </div>

            {/* Card 2: Tickets en Attente & Retours */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  {language === 'ar' ? 'التذاكر المعلقة والمرتجعات' : 'Tickets en Attente & Avoirs'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                  {parkedOrders.length} en pause
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 font-mono">
                  {formatMoney(salesKpis.totalRefunded)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                  <RotateCcw size={13} className="text-rose-500" />
                  <span>{salesKpis.refundedCount} avoirs traités</span>
                </div>
              </div>
            </div>

            {/* Card 3: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#E7E5E4]">
                  {language === 'ar' ? 'صافي الإيرادات المقبوضة' : 'Chiffre d’Affaires Net Encaissé'}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30 uppercase tracking-wider">
                  Net Réalisé
                </span>
              </div>
              <div>
                <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">
                  {formatMoney(salesKpis.netRevenue)}
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} className="text-[#FB923C]" />
                    <span>Déduction faite des avoirs clients</span>
                  </span>
                  <span className="font-mono text-stone-300">DZD</span>
                </div>
              </div>

              {/* Decorative Subtle Background Sparkline */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FB923C]/5 rounded-full blur-2xl pointer-events-none" />
            </div>

          </div>
        </div>

        {/* Bottom Collection Pod Tray (SurfaceBgElevated: #F8F9FA) */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
          
          {/* Subtab Segmented Switcher & Search Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Left Title / Icon / Count Anchor */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
                <Receipt size={18} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'سجل تذاكر المبيعات' : 'Grand Livre des Encaissements'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#C4785A]/10 text-[#C4785A]">
                  {activeSubTab === 'sales' ? filteredSales.length : parkedOrders.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
              {/* Segment Capsules */}
              <div className="flex items-center gap-1.5 bg-neutral-200/60 dark:bg-neutral-800 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('sales')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    activeSubTab === 'sales'
                      ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <Receipt size={14} />
                  <span>{language === 'ar' ? 'المبيعات' : 'Encaissés'}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeSubTab === 'sales' ? 'bg-[#C4785A]/15 text-[#C4785A]' : 'bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500'
                  }`}>
                    {branchSales.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('parked')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    activeSubTab === 'parked'
                      ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <PauseCircle size={14} />
                  <span>{language === 'ar' ? 'المعلقة' : 'En Pause'}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeSubTab === 'parked' ? 'bg-[#C4785A]/15 text-[#C4785A]' : 'bg-neutral-300/60 dark:bg-neutral-700 text-neutral-500'
                  }`}>
                    {parkedOrders.length}
                  </span>
                </button>
              </div>

              {/* Quick Date Capsules (when on sales tab) */}
              {activeSubTab === 'sales' && (
                <div className="flex items-center gap-1 bg-neutral-200/50 dark:bg-neutral-800/60 p-1 rounded-xl text-xs font-bold overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setDateFilter('all')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                      dateFilter === 'all' ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-2xs' : 'text-neutral-500'
                    }`}
                  >
                    {language === 'ar' ? 'الكل' : 'Tous'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilter('today')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                      dateFilter === 'today' ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-2xs' : 'text-neutral-500'
                    }`}
                  >
                    {language === 'ar' ? 'اليوم' : 'Aujourd’hui'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilter('7days')}
                    className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                      dateFilter === '7days' ? 'bg-white dark:bg-neutral-700 text-[#C4785A] shadow-2xs' : 'text-neutral-500'
                    }`}
                  >
                    {language === 'ar' ? '7 أيام' : '7 jours'}
                  </button>
                </div>
              )}

              {/* Seek Search */}
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={language === 'ar' ? 'بحث برقم الوصل، الزبون...' : 'Filtrer N° ticket, client...'}
                shutSize={36}
                openWidth={220}
              />
            </div>
          </div>

          {/* Table Container Inside Pod Tray */}
          <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs overflow-hidden">
            {activeSubTab === 'sales' ? (
              <UniversalDataCollection<Sale>
                items={filteredSales}
                keyExtractor={(s) => s.id}
                defaultViewMode="list"
                columns={salesColumns}
                isLoading={isSyncing || networkMode === 'force_skeleton'}
                isOffline={networkMode === 'offline'}
                isTimedOut={isSyncTimeout}
                lastSyncedAt={lastSyncedAt}
                onRetrySync={retryCloudSync}
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
                emptyTitle={language === 'ar' ? 'لا توجد مبيعات مطابقة' : 'Aucune vente trouvée'}
                emptyDescription={language === 'ar' ? 'لا توجد نتائج مطابقة لمعايير البحث الحالية.' : 'Aucun ticket ne correspond à vos filtres de recherche.'}
              />
            ) : (
              <UniversalDataCollection<ParkedOrder>
                items={filteredParkedOrders}
                keyExtractor={(po) => po.id}
                defaultViewMode="list"
                columns={parkedColumns}
                isLoading={isSyncing || networkMode === 'force_skeleton'}
                isOffline={networkMode === 'offline'}
                isTimedOut={isSyncTimeout}
                lastSyncedAt={lastSyncedAt}
                onRetrySync={retryCloudSync}
                renderCard={(po) => (
                  <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-neutral-900 dark:text-white">{po.referenceName}</span>
                      <span className="font-mono font-bold text-xs text-[#C4785A]">{formatMoney(po.totalAmount)}</span>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      {po.items.length} article(s) · {new Date(po.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                emptyTitle={language === 'ar' ? 'لا توجد تذاكر معلقة' : 'Aucun ticket en attente'}
                emptyDescription={language === 'ar' ? 'جميع الطلبات تمت معالجتها أو لا توجد تذاكر معلقة.' : 'Tous les encaissements ont été finalisés.'}
              />
            )}
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
