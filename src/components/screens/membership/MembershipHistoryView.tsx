import React, { useState, useMemo } from 'react';
import {
  History,
  Receipt,
  CreditCard,
  Banknote,
  User,
  Home,
  ChevronDown,
  Download,
  Maximize2,
  X,
  Check,
  Building2,
  Printer,
  Scissors,
  RotateCcw,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { Sale } from '../../../types/index';
import { formatMoney } from '../../../utils/rules';
import { Seek } from '../../ui/Seek';
import { LabelSelect } from '../../ui/LabelSelect';
import { t } from '../../../utils/i18n';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';

export const MembershipHistoryView: React.FC = () => {
  const {
    sales,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    setScreen,
    refundSale,
    language,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'All' | 'Cash' | 'Card' | 'MemberBalance' | 'Split'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Settled' | 'Refunded'>('All');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('Customer return / exchange');
  const [refundSuccessToast, setRefundSuccessToast] = useState<string | null>(null);

  // UniversalDataCollection state
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());
  const [pinnedSaleIds, setPinnedSaleIds] = useState<Set<string>>(new Set());
  const [saleSortBy, setSaleSortBy] = useState<string>('date');
  const [saleSortDir, setSaleSortDir] = useState<'asc' | 'desc'>('desc');

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      if (statusFilter === 'Settled' && s.status === 'Refunded') return false;
      if (statusFilter === 'Refunded' && s.status !== 'Refunded') return false;
      if (methodFilter !== 'All' && s.paymentMethod !== methodFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = s.id.toLowerCase().includes(q);
        const matchName = s.memberName?.toLowerCase().includes(q);
        const matchMethod = s.paymentMethod.toLowerCase().includes(q);
        const matchItem = s.items.some((i) => i.productName.toLowerCase().includes(q));
        if (!matchId && !matchName && !matchMethod && !matchItem) return false;
      }
      return true;
    });
  }, [sales, statusFilter, methodFilter, searchQuery]);

  const totalSettledAmount = useMemo(() => {
    return sales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [sales]);

  const cashShare = useMemo(() => {
    const cashTotal = sales
      .filter((s) => s.paymentMethod === 'Cash')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    return totalSettledAmount > 0 ? Math.round((cashTotal / totalSettledAmount) * 100) : 0;
  }, [sales, totalSettledAmount]);

  // Sort sales according to collection state
  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => {
      const aPinned = pinnedSaleIds.has(a.id);
      const bPinned = pinnedSaleIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (saleSortBy === 'date') {
        const cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return saleSortDir === 'asc' ? cmp : -cmp;
      }
      if (saleSortBy === 'id') {
        const cmp = a.id.localeCompare(b.id);
        return saleSortDir === 'asc' ? cmp : -cmp;
      }
      if (saleSortBy === 'customer') {
        const cmp = (a.memberName || '').localeCompare(b.memberName || '');
        return saleSortDir === 'asc' ? cmp : -cmp;
      }
      if (saleSortBy === 'total') {
        const cmp = a.totalAmount - b.totalAmount;
        return saleSortDir === 'asc' ? cmp : -cmp;
      }
      if (saleSortBy === 'method') {
        const cmp = a.paymentMethod.localeCompare(b.paymentMethod);
        return saleSortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredSales, pinnedSaleIds, saleSortBy, saleSortDir]);

  const handleExportCSV = () => {
    const headers = ['Receipt ID', 'Date', 'Time', 'Customer', 'Items Count', 'Payment Method', 'Total (DA)'];
    const rows = filteredSales.map((s) => [
      `"${s.id}"`,
      `"${new Date(s.createdAt).toLocaleDateString()}"`,
      `"${new Date(s.createdAt).toLocaleTimeString()}"`,
      `"${s.memberName || 'Guest Walk-In'}"`,
      `"${s.items.length}"`,
      `"${s.paymentMethod}"`,
      `"${s.totalAmount}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `atrium-sales-audit-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const getLocalizedPaymentMethod = (method: string) => {
    if (method === 'Cash') return language === 'ar' ? 'نقداً' : language === 'fr' ? 'Espèces' : 'Cash';
    if (method === 'Card') return language === 'ar' ? 'بطاقة بنكية' : language === 'fr' ? 'Carte bancaire' : 'Card';
    if (method === 'Split') return language === 'ar' ? 'مقسم' : language === 'fr' ? 'Mixte' : 'Split';
    if (method === 'MemberBalance') return language === 'ar' ? 'رصيد المشترك' : language === 'fr' ? 'Solde adhérent' : 'Member Balance';
    return method;
  };

  const saleColumns: ColumnDefinition<Sale>[] = useMemo(() => [
    {
      key: 'id',
      header: language === 'ar' ? 'رقم الوصل' : language === 'fr' ? 'N° Ticket' : 'Receipt ID',
      width: '1.2*',
      minWidth: '110px',
      sortable: true,
      renderCell: (sale) => (
        <span className="font-mono text-xs font-bold text-[#C4785A]">
          #{sale.id}
        </span>
      ),
    },
    {
      key: 'date',
      header: language === 'ar' ? 'التاريخ والوقت' : language === 'fr' ? 'Date & Heure' : 'Date & Time',
      width: '1.5*',
      minWidth: '130px',
      sortable: true,
      renderCell: (sale) => (
        <div className="text-xs text-neutral-600 dark:text-neutral-300 tabular-nums">
          <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
          <span className="text-neutral-400 ml-1.5 font-mono text-[11px]">
            {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: language === 'ar' ? 'العميل / المشترك' : language === 'fr' ? 'Client / Adhérent' : 'Customer',
      width: '2*',
      minWidth: '150px',
      sortable: true,
      renderCell: (sale) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-300 shrink-0">
            {(sale.memberName || 'G').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-neutral-900 dark:text-white truncate block">
              {sale.memberName || (language === 'ar' ? 'زائر غير مسجل' : language === 'fr' ? 'Client de passage' : 'Guest Walk-In')}
            </span>
            {sale.customerPhone && (
              <span className="text-[10px] text-neutral-400 font-mono block">
                {sale.customerPhone}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'items',
      header: language === 'ar' ? 'الأصناف المشتراة' : language === 'fr' ? 'Articles achetés' : 'Purchased Items',
      width: '2.5*',
      minWidth: '180px',
      renderCell: (sale) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {sale.items.slice(0, 3).map((it, idx) => (
            <span key={idx} className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
              {it.quantity}x {it.productName}
            </span>
          ))}
          {sale.items.length > 3 && (
            <span className="text-[10px] text-neutral-400 font-bold">
              +{sale.items.length - 3}
            </span>
          )}
          {sale.notes && (
            <span className="px-2 py-0.5 rounded-md bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] text-[10px] font-bold flex items-center gap-1 border border-[#F5E2D8] dark:border-neutral-700">
              <Scissors size={10} />
              <span className="truncate max-w-[120px]">{sale.notes.replace('Salon Appointment Checkout — ', '')}</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'method',
      header: language === 'ar' ? 'طريقة الدفع' : language === 'fr' ? 'Mode de règlement' : 'Tender Method',
      width: '1.8*',
      minWidth: '130px',
      sortable: true,
      renderCell: (sale) => (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            {sale.paymentMethod === 'Cash' && <Banknote size={13} className="text-emerald-600" />}
            {sale.paymentMethod === 'Card' && <CreditCard size={13} className="text-blue-600" />}
            {sale.paymentMethod === 'Split' && <CreditCard size={13} className="text-purple-600" />}
            {sale.paymentMethod === 'MemberBalance' && <User size={13} className="text-[#C4785A]" />}
            <span>{getLocalizedPaymentMethod(sale.paymentMethod)}</span>
          </span>
          {sale.status === 'Refunded' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              {language === 'ar' ? 'مسترجع' : language === 'fr' ? 'Remboursé' : 'Refunded'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'total',
      header: language === 'ar' ? 'المبلغ المحصل' : language === 'fr' ? 'Montant réglé' : 'Settled Amount',
      width: '1.4*',
      minWidth: '110px',
      sortable: true,
      renderCell: (sale) => (
        <div className="text-right tabular-nums">
          <div className={`text-xs font-black font-mono ${sale.status === 'Refunded' ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-white'}`}>
            {formatMoney(sale.totalAmount)}
          </div>
          {sale.status === 'Refunded' && (
            <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
              {language === 'ar' ? 'تم الإلغاء' : language === 'fr' ? 'Annulé' : 'Cancelled'}
            </div>
          )}
        </div>
      ),
    },
  ], [language]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative">
      {/* Toast Alert */}
      {refundSuccessToast && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 rounded-2xl text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center justify-between shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-rose-600" />
            <span>{refundSuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefundSuccessToast(null)}
            className="text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Row 0: Top Header matching Desktop App */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <History size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {t('history_sales_ledger', language)}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {language === 'ar'
                ? `المعاملات المالية المنجزة، وصولات نقطة البيع وسجل العمليات لـ ${currentBranch?.name || 'الفرع'}`
                : language === 'fr'
                ? `Règlements financiers, tickets de caisse POS et piste d'audit pour ${currentBranch?.name || 'l\'établissement'}`
                : `Financial settlement, POS payment receipts, and audit trail for ${currentBranch?.name || 'Atrium 1'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative">
          {/* Facility Pill: Atrium 1 ▾ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-full bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Home size={15} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || 'Atrium 1'}
              </span>
              <ChevronDown
                size={14}
                className={`text-neutral-500 transition-transform ${
                  isFacilityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isFacilityDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {t('fast_switch_title', language)}
                </div>
                {businesses.map((biz) => {
                  const isCurrent = biz.id === currentBusinessId;
                  const matchingBranch = branches.find((b) => b.businessId === biz.id);
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        switchBusiness(biz.id);
                        if (matchingBranch) switchBranch(matchingBranch.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                        <span className="truncate">{biz.name}</span>
                      </div>
                      {isCurrent && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Button: New POS Sale */}
          <button
            type="button"
            onClick={() => setScreen('shop')}
            style={{
              backgroundColor: 'var(--color-accent)',
            }}
            className="h-10 px-5 rounded-full text-xs font-bold text-white flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-98 transition-all shadow-xs"
          >
            <Receipt size={15} strokeWidth={2.5} />
            <span>{t('shop_title', language)}</span>
          </button>
        </div>
      </div>

      {/* Row 1: Financial Settlement & Audit Health Banner Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'التسويات المالية ومؤشرات التدقيق' : language === 'fr' ? 'Règlements financiers & Piste d\'audit' : 'Financial Settlement & Audit Velocity'}
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            {language === 'ar' ? 'المدفوعات المحصلة، إغلاق الصناديق اليومية والمعاملات الإلكترونية' : language === 'fr' ? 'Paiements rapprochés, clôtures de caisse et transactions électroniques' : 'Reconciled payments, daily cash drawers, and electronic transactions'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tile 1: Total Reconciled Volume */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                {language === 'ar' ? 'إجمالي الحجم المحصل' : language === 'fr' ? 'Volume total rapproché' : 'Total Reconciled Volume'}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  ↗ 100% {language === 'ar' ? 'مدقق' : language === 'fr' ? 'Audité' : 'Audited'}
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {formatMoney(totalSettledAmount)}
            </div>
          </div>

          {/* Tile 2: Tender Distribution */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                {language === 'ar' ? 'نسبة الدفع النقدي' : language === 'fr' ? 'Part des espèces' : 'Cash Tender Ratio'}
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full">
                  {cashShare}% {language === 'ar' ? 'نقداً' : language === 'fr' ? 'Espèces' : 'Cash'}
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {sales.length}{' '}
              <span className="text-xs font-normal text-neutral-400">
                {language === 'ar' ? 'وصل صادر' : language === 'fr' ? 'reçus émis' : 'receipts issued'}
              </span>
            </div>
          </div>

          {/* Tile 3: Dark Obsidian Card */}
          <div className="p-5 rounded-[20px] bg-[#18181B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div>
              <span className="text-xs font-medium text-neutral-300">
                {language === 'ar' ? 'حالة نقطة البيع النشطة' : language === 'fr' ? 'État du terminal actif' : 'Active Terminal State'}
              </span>
              <div className="text-[11px] text-[#C4785A] font-semibold mt-0.5">
                {language === 'ar' ? 'صندوق الاستقبال POS-01' : language === 'fr' ? 'Caisse d\'accueil POS-01' : 'Frontdesk Register POS-01'}
              </div>
            </div>
            <div className="text-2xl font-black text-white tabular-nums flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {language === 'ar' ? 'متصل ومحدث' : language === 'fr' ? 'En Ligne & Synchronisé' : 'Online & Synchronized'}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Transactions Master Universal Data Collection Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Table Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Icon + Title + Count */}
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'سجل العمليات والوصولات' : language === 'fr' ? 'Journal des transactions' : 'Transactions & Sales Collection'}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
              {filteredSales.length}
            </span>
          </div>

          {/* Right Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {/* Seek Kinetic Search Box */}
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={language === 'ar' ? 'البحث عن رقم الوصل، المشترك، المنتج...' : language === 'fr' ? 'Rechercher ticket, client, produit...' : 'Search receipt ID, member, item...'}
              shutSize={36}
              openWidth={230}
            />

            {/* Status Capsules: All | Settled | Refunded */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs">
              {(['All', 'Settled', 'Refunded'] as const).map((st) => {
                const isActive = statusFilter === st;
                const label =
                  st === 'All'
                    ? (language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All')
                    : st === 'Settled'
                    ? (language === 'ar' ? 'مسدد' : language === 'fr' ? 'Encaissé' : 'Settled')
                    : (language === 'ar' ? 'مسترجع' : language === 'fr' ? 'Remboursé' : 'Refunded');
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    style={{
                      backgroundColor: isActive ? (st === 'Refunded' ? '#FEE2E2' : '#FCEEE8') : 'transparent',
                      color: isActive ? (st === 'Refunded' ? '#DC2626' : 'var(--color-accent)') : '#71717A',
                    }}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      isActive ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Payment Method Capsules */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs">
              {(['All', 'Cash', 'Card', 'Split', 'MemberBalance'] as const).map((method) => {
                const isActive = methodFilter === method;
                const label =
                  method === 'All'
                    ? (language === 'ar' ? 'الكل' : language === 'fr' ? 'Tous' : 'All')
                    : method === 'Cash'
                    ? (language === 'ar' ? 'نقداً' : language === 'fr' ? 'Espèces' : 'Cash')
                    : method === 'Card'
                    ? (language === 'ar' ? 'بطاقة CIB' : language === 'fr' ? 'Carte' : 'Card')
                    : method === 'Split'
                    ? (language === 'ar' ? 'مقسم' : language === 'fr' ? 'Mixte' : 'Split')
                    : (language === 'ar' ? 'الرصيد' : language === 'fr' ? 'Solde' : 'Balance');
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setMethodFilter(method)}
                    style={{
                      backgroundColor: isActive ? '#FCEEE8' : 'transparent',
                      color: isActive ? 'var(--color-accent)' : '#71717A',
                    }}
                    className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                      isActive ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Export Data Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-9 px-3.5 rounded-full border border-[#E9EEF0] dark:border-neutral-700/60 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors shadow-2xs"
              title="Download CSV audit log"
            >
              <Download size={13} />
              <span>{language === 'ar' ? 'تصدير السجل' : language === 'fr' ? 'Exporter le journal' : 'Export Ledger'}</span>
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="w-9 h-9 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-center text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer transition-colors shadow-2xs"
              title="Toggle Fullscreen"
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>

        {/* Universal Data Collection for Sales */}
        <UniversalDataCollection<Sale>
          items={sortedSales}
          keyExtractor={(s) => s.id}
          defaultViewMode="list"
          sortBy={saleSortBy}
          sortDirection={saleSortDir}
          onSortChange={(key) => {
            if (saleSortBy === key) {
              setSaleSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            } else {
              setSaleSortBy(key);
              setSaleSortDir('desc');
            }
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
          onItemClick={(sale) => setSelectedSale(sale)}
          columns={saleColumns}
          renderCard={(sale) => (
            <div className="flex flex-col justify-between h-full space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-[#C4785A]">
                    #{sale.id}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {sale.paymentMethod === 'Cash' && <Banknote size={12} className="text-emerald-600" />}
                    {sale.paymentMethod === 'Card' && <CreditCard size={12} className="text-blue-600" />}
                    {sale.paymentMethod === 'Split' && <CreditCard size={12} className="text-purple-600" />}
                    {sale.paymentMethod === 'MemberBalance' && <User size={12} className="text-[#C4785A]" />}
                    <span>{getLocalizedPaymentMethod(sale.paymentMethod)}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-300 shrink-0">
                    {(sale.memberName || 'G').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                      {sale.memberName || (language === 'ar' ? 'زائر غير مسجل' : language === 'fr' ? 'Client de passage' : 'Guest Walk-In')}
                    </h3>
                    <p className="text-[10px] text-neutral-400 font-mono">
                      {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Items preview */}
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-2.5 rounded-xl space-y-1 text-xs">
                  {sale.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] text-neutral-600 dark:text-neutral-300">
                      <span className="truncate max-w-[150px]">{it.quantity}x {it.productName}</span>
                      <span className="font-mono text-neutral-500 tabular-nums">{formatMoney(it.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-medium">
                    {language === 'ar' ? 'الإجمالي' : 'Total'}
                  </span>
                  <span className={`text-sm font-black font-mono ${sale.status === 'Refunded' ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-white'}`}>
                    {formatMoney(sale.totalAmount)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSale(sale);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={12} />
                    <span>{language === 'ar' ? 'عرض' : 'View'}</span>
                  </button>
                  {sale.status !== 'Refunded' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSale(sale);
                        setIsRefundModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-xs font-bold text-rose-600 dark:text-rose-300 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>{language === 'ar' ? 'استرجاع' : 'Refund'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          emptyTitle={language === 'ar' ? 'لا توجد معاملات تطابق خيارات البحث' : 'No sales transactions found'}
          emptyDescription={language === 'ar' ? 'جرب تغيير شروط البحث أو مسح المرشحات لتظهر جميع العمليات' : 'Try adjusting your search terms or clearing filters to display transactions.'}
        />
      </div>

      {/* Desktop Slide-out Inspector Drawer matching MembersScreen */}
      {selectedSale && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={17} className="text-[#C4785A]" />
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'معاينة وتدقيق الوصل' : language === 'fr' ? 'Inspecteur du reçu' : 'Receipt Audit Inspector'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSale(null)}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* Refunded Banner if applicable */}
            {selectedSale.status === 'Refunded' && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 space-y-1">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold">
                  <RotateCcw size={15} className="text-rose-600" />
                  <span>{language === 'ar' ? 'معاملة مسترجعة ومعاد تخزينها' : language === 'fr' ? 'TRANSACTION REMBOURSÉE & RÉINTÉGRÉE' : 'TRANSACTION REFUNDED & RESTOCKED'}</span>
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-300">
                  {selectedSale.notes || (language === 'ar' ? 'تم استرجاع المعاملة بالكامل وإرجاع الأصناف للمخزون.' : language === 'fr' ? 'Remboursement effectué. Les articles ont été réintégrés au stock.' : 'Full refund processed. Inventory levels have been automatically returned to stock.')}
                </p>
              </div>
            )}

            {/* Top receipt overview */}
            <div className="p-4 rounded-2xl bg-[#FAF9F6] dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">{language === 'ar' ? 'رقم الوصل:' : language === 'fr' ? 'Réf ticket :' : 'Receipt Ref:'}</span>
                <span className="font-mono font-bold text-[#C4785A]">#{selectedSale.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">{language === 'ar' ? 'الوقت والتاريخ:' : language === 'fr' ? 'Date & heure :' : 'Timestamp:'}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
                  {new Date(selectedSale.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">{language === 'ar' ? 'العميل:' : language === 'fr' ? 'Client :' : 'Customer:'}</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {selectedSale.memberName || (language === 'ar' ? 'زائر غير مسجل' : language === 'fr' ? 'Client de passage' : 'Guest Walk-In')}
                </span>
              </div>
              {selectedSale.customerPhone && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">{language === 'ar' ? 'الهاتف:' : language === 'fr' ? 'Téléphone :' : 'Phone:'}</span>
                  <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                    {selectedSale.customerPhone}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">{language === 'ar' ? 'طريقة الدفع:' : language === 'fr' ? 'Mode de règlement :' : 'Payment Tender:'}</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {selectedSale.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">{language === 'ar' ? 'نقطة البيع:' : language === 'fr' ? 'Poste de caisse :' : 'Facility Station:'}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {currentBranch?.name || 'Atrium 1'} (POS-01)
                </span>
              </div>
            </div>

            {/* Stylist Attribution if present */}
            {selectedSale.notes && !selectedSale.notes.includes('REFUNDED') && (
              <div className="p-3.5 rounded-2xl bg-[#FDF4F0] dark:bg-neutral-800/80 border border-[#F5E2D8] dark:border-neutral-700 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C4785A] flex items-center gap-1">
                  <Scissors size={12} />
                  <span>{language === 'ar' ? 'الملاحظات / الإسناد' : language === 'fr' ? 'Attribution / Notes' : 'Attribution / Notes'}</span>
                </span>
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  {selectedSale.notes}
                </p>
              </div>
            )}

            {/* Line Items breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                {language === 'ar' ? 'الأصناف المشتراة' : language === 'fr' ? 'Articles' : 'Line Items'} ({selectedSale.items.length})
              </span>
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
                {selectedSale.items.map((item, idx) => (
                  <div key={idx} className="p-3.5 flex justify-between items-center bg-white dark:bg-neutral-800/40">
                    <div>
                      <div className="font-bold text-neutral-900 dark:text-white">
                        {item.productName}
                      </div>
                      <div className="text-[11px] text-neutral-400 tabular-nums mt-0.5">
                        {item.quantity} × {formatMoney(item.unitPrice)}
                        {item.discount ? ` (disc: -${formatMoney(item.discount)})` : ''}
                      </div>
                    </div>
                    <span className="font-black text-neutral-900 dark:text-white tabular-nums">
                      {formatMoney(item.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grand Total */}
            <div className="p-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#E8DFD8] dark:border-neutral-700 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-[#C4785A]">
                  {language === 'ar' ? 'إجمالي المدفوع' : language === 'fr' ? 'Total Encaissé' : 'Total Settled'}
                </span>
                <div className="text-[11px] text-neutral-500">
                  {language === 'ar' ? 'شامل الرسوم والضرائب' : language === 'fr' ? 'TTC (Toutes taxes comprises)' : 'Includes VAT & taxes'}
                </div>
              </div>
              <span className={`text-2xl font-black tabular-nums ${selectedSale.status === 'Refunded' ? 'line-through text-neutral-400' : 'text-[#C4785A]'}`}>
                {formatMoney(selectedSale.totalAmount)}
              </span>
            </div>

            {/* Action Buttons: Refund & Print */}
            <div className="space-y-2 pt-2">
              {selectedSale.status !== 'Refunded' && (
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(true)}
                  className="w-full h-10 rounded-full border border-rose-200 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
                >
                  <RotateCcw size={14} />
                  <span>{language === 'ar' ? 'استرجاع الوصل وإعادة المنتجات للمخزون' : language === 'fr' ? 'Rembourser & Réintégrer au stock' : 'Process Refund & Restock Items'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full h-10 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors shadow-2xs"
              >
                <Printer size={15} />
                <span>{language === 'ar' ? 'طباعة الوصل الحراري' : language === 'fr' ? 'Imprimer le ticket thermique' : 'Print Thermal Receipt'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                style={{ backgroundColor: 'var(--color-accent)' }}
                className="w-full h-10 rounded-full text-xs font-bold text-white flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity shadow-xs"
              >
                {language === 'ar' ? 'إغلاق المعاينة' : language === 'fr' ? 'Fermer l\'inspecteur' : 'Close Inspector'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Confirmation Modal */}
      {isRefundModalOpen && selectedSale && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-6 space-y-5 border border-neutral-200 dark:border-neutral-800 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {language === 'ar' ? 'تأكيد استرجاع المعاملة' : language === 'fr' ? 'Confirmer le remboursement' : 'Confirm Transaction Refund'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {language === 'ar' ? 'معاملة' : 'Sale'} #{selectedSale.id} • {formatMoney(selectedSale.totalAmount)}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                {language === 'ar'
                  ? `سيؤدي الاسترجاع إلى إعادة جميع الأصناف (${selectedSale.items.reduce((s, i) => s + i.quantity, 0)}) إلى مخزون الفرع المتاح وتوثيق العملية في سجل التدقيق.`
                  : language === 'fr'
                  ? `Ce remboursement réintégrera l'ensemble des ${selectedSale.items.reduce((s, i) => s + i.quantity, 0)} articles au stock du magasin et tracera l'opération.`
                  : `Refunding will return all ${selectedSale.items.reduce((s, i) => s + i.quantity, 0)} items back to available branch stock and create an audit log.`}
              </span>
            </div>

            <div>
              <LabelSelect
                field="RefundReason"
                label={`${language === 'ar' ? 'سبب الاسترجاع / الإرجاع' : language === 'fr' ? 'Motif de retour / remboursement' : 'Reason for Refund / Return'} *`}
                value={refundReason}
                onChange={(val) => setRefundReason(val?.target?.value ?? String(val))}
                options={[
                  language === 'ar' ? 'إرجاع أو استبدال من العميل' : language === 'fr' ? 'Retour ou échange client' : 'Customer return / exchange',
                  language === 'ar' ? 'خطأ في إدخال الصنف من الكاشير' : language === 'fr' ? 'Erreur de saisie par le caissier' : 'Wrong item rung up by cashier',
                  language === 'ar' ? 'منتج معيب أو تالف' : language === 'fr' ? 'Article défectueux ou endommagé' : 'Defective or damaged product',
                  language === 'ar' ? 'تراجع العميل قبل المغادرة' : language === 'fr' ? 'Changement d\'avis avant départ' : 'Customer changed mind before leaving',
                  language === 'ar' ? 'تعديل السعر أو الخصم' : language === 'fr' ? 'Ajustement de tarif ou remise' : 'Pricing / discount adjustment',
                ]}
                width="100%"
                height={46}
                corner={14}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRefundModalOpen(false)}
                className="h-10 px-4 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"
              >
                {t('action_cancel', language)}
              </button>
              <button
                type="button"
                onClick={() => {
                  refundSale(selectedSale.id, refundReason);
                  setRefundSuccessToast(
                    language === 'ar'
                      ? `تم استرجاع الوصل #${selectedSale.id} وإعادة الأصناف للمخزون.`
                      : language === 'fr'
                      ? `Vente #${selectedSale.id} remboursée. Articles réintégrés au stock.`
                      : `Refunded Sale #${selectedSale.id}. Items returned to inventory.`
                  );
                  setSelectedSale({
                    ...selectedSale,
                    status: 'Refunded',
                    notes: `REFUNDED: ${refundReason}`,
                  });
                  setIsRefundModalOpen(false);
                  setTimeout(() => setRefundSuccessToast(null), 5000);
                }}
                className="h-10 px-5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-full shadow-xs"
              >
                {language === 'ar' ? 'تأكيد الاسترجاع وإعادة التخزين' : language === 'fr' ? 'Confirmer le remboursement' : 'Confirm Refund & Restock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const HistoryScreen = MembershipHistoryView;
