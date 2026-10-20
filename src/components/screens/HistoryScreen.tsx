import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Receipt,
  CreditCard,
  Banknote,
  User,
  Calendar,
  Home,
  ChevronDown,
  Download,
  LayoutGrid,
  List,
  Maximize2,
  X,
  Check,
  Building2,
  Printer,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  FileSpreadsheet,
  Scissors,
  RotateCcw,
  AlertCircle,
  Clock,
  Phone,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { Sale } from '../../types/index';
import { formatMoney } from '../../utils/rules';
import { Seek } from '../ui/Seek';
import { LabelSelect } from '../ui/LabelSelect';
import { t } from '../../utils/i18n';

export const HistoryScreen: React.FC = () => {
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
    receiptConfig,
    language,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [methodFilter, setMethodFilter] = useState<'All' | 'Cash' | 'Card' | 'MemberBalance' | 'Split'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Settled' | 'Refunded'>('All');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('Customer return / exchange');
  const [refundSuccessToast, setRefundSuccessToast] = useState<string | null>(null);

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
            Financial Settlement & Audit Velocity
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Reconciled payments, daily cash drawers, and electronic transactions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tile 1: Total Reconciled Volume — Pure White Card */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                Total Reconciled Volume
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  ↗ 100% Audited
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {formatMoney(totalSettledAmount)}
            </div>
          </div>

          {/* Tile 2: Tender Distribution — Pure White Card */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div>
              <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                Cash Tender Ratio
              </span>
              <div className="mt-1">
                <span className="text-[10px] font-bold text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-full">
                  {cashShare}% Espèces
                </span>
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums">
              {sales.length}{' '}
              <span className="text-xs font-normal text-neutral-400">reçus émis</span>
            </div>
          </div>

          {/* Tile 3: Dark Obsidian Card */}
          <div className="p-5 rounded-[20px] bg-[#18181B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div>
              <span className="text-xs font-medium text-neutral-300">
                Active Terminal State
              </span>
              <div className="text-[11px] text-[#C4785A] font-semibold mt-0.5">
                Frontdesk Register POS-01
              </div>
            </div>
            <div className="text-2xl font-black text-white tabular-nums flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              En Ligne & Synchronisé
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Transactions Master Table Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Table Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Icon + Title + Count */}
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-neutral-500" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              Transactions
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
              placeholder="Search receipt ID, member, item..."
              shutSize={36}
              openWidth={230}
            />

            {/* Status Capsules: All | Settled | Refunded */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs">
              {(['All', 'Settled', 'Refunded'] as const).map((st) => {
                const isActive = statusFilter === st;
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
                    {st}
                  </button>
                );
              })}
            </div>

            {/* Payment Method Capsules */}
            <div className="flex items-center p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 gap-0.5 text-xs font-semibold shadow-2xs">
              {(['All', 'Cash', 'Card', 'Split', 'MemberBalance'] as const).map((method) => {
                const isActive = methodFilter === method;
                const label = method === 'MemberBalance' ? 'Balance' : method;
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
              <span>Export Ledger</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                  viewMode === 'grid'
                    ? 'text-[#C4785A] bg-[#C4785A]/10 font-bold'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
                title="Grid view"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-full cursor-pointer transition-colors ${
                  viewMode === 'list'
                    ? 'text-[#C4785A] bg-[#C4785A]/10 font-bold'
                    : 'text-neutral-400 hover:text-neutral-600'
                }`}
                title="List view"
              >
                <List size={14} />
              </button>
            </div>

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

        {/* Content View: List or Grid */}
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-200/60 dark:border-neutral-800/80 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider h-11">
                  <th className="px-5">Receipt ID</th>
                  <th className="px-4">Date & Time</th>
                  <th className="px-4">Customer</th>
                  <th className="px-4">Purchased Items</th>
                  <th className="px-4">Tender Method</th>
                  <th className="px-4 text-right">Settled Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/40 dark:divide-neutral-800/60">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-xs text-neutral-400">
                      No transaction records match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr
                      key={sale.id}
                      onClick={() => setSelectedSale(sale)}
                      className={`h-16 transition-colors cursor-pointer ${
                        selectedSale?.id === sale.id
                          ? 'bg-[#FCEEE8]/60 dark:bg-neutral-800'
                          : 'hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50'
                      }`}
                    >
                      <td className="px-5 py-3 font-mono text-xs font-bold text-[#C4785A]">
                        #{sale.id}
                      </td>

                      <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300 tabular-nums">
                        {new Date(sale.createdAt).toLocaleDateString()}{' '}
                        <span className="text-neutral-400 ml-1">
                          {new Date(sale.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-300">
                            {(sale.memberName || 'G').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                              {sale.memberName || 'Guest Walk-In'}
                            </span>
                            {sale.customerPhone && (
                              <span className="text-[10px] text-neutral-400 block font-mono">
                                {sale.customerPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300 max-w-xs truncate">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {sale.items.map((it, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium"
                            >
                              {it.quantity}x {it.productName}
                            </span>
                          ))}
                          {sale.notes && (
                            <span className="px-2 py-0.5 rounded-md bg-[#FDF4F0] dark:bg-neutral-800 text-[#C4785A] text-[10px] font-bold flex items-center gap-1 border border-[#F5E2D8] dark:border-neutral-700">
                              <Scissors size={10} />
                              <span>{sale.notes.replace('Salon Appointment Checkout — ', '')}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                            {sale.paymentMethod === 'Cash' && <Banknote size={13} className="text-emerald-600" />}
                            {sale.paymentMethod === 'Card' && <CreditCard size={13} className="text-blue-600" />}
                            {sale.paymentMethod === 'Split' && <CreditCard size={13} className="text-purple-600" />}
                            {sale.paymentMethod === 'MemberBalance' && <User size={13} className="text-[#C4785A]" />}
                            <span>{sale.paymentMethod}</span>
                          </span>

                          {sale.status === 'Refunded' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              Refunded
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right tabular-nums">
                        <div className={`text-sm font-black ${sale.status === 'Refunded' ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-white'}`}>
                          {formatMoney(sale.totalAmount)}
                        </div>
                        {sale.status === 'Refunded' && (
                          <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            0 DZD (Restocked)
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View matching desktop cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSales.map((sale) => (
              <div
                key={sale.id}
                onClick={() => setSelectedSale(sale)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedSale?.id === sale.id
                    ? 'border-[#C4785A] bg-[#FAF9F6] dark:bg-neutral-800/80 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-[#C4785A]">#{sale.id}</span>
                  <div className="flex items-center gap-1.5">
                    {sale.status === 'Refunded' && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700">
                        Refunded
                      </span>
                    )}
                    <span className="text-[11px] text-neutral-400 tabular-nums">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    {(sale.memberName || 'G').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-white">
                      {sale.memberName || 'Guest Walk-In'}
                    </h3>
                    <p className="text-[11px] text-neutral-400">{sale.paymentMethod}</p>
                  </div>
                </div>

                <div className="text-xs text-neutral-500 line-clamp-2 mb-2">
                  {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                </div>

                {sale.notes && (
                  <div className="text-[11px] font-semibold text-[#C4785A] mb-3 flex items-center gap-1 bg-[#FDF4F0] dark:bg-neutral-800 px-2.5 py-1 rounded-lg border border-[#F5E2D8] dark:border-neutral-700 truncate">
                    <Scissors size={11} className="shrink-0" />
                    <span className="truncate">{sale.notes.replace('Salon Appointment Checkout — ', '')}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-xs text-neutral-400 font-medium">Settled Amount</span>
                  <span className={`text-base font-black tabular-nums ${sale.status === 'Refunded' ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-white'}`}>
                    {formatMoney(sale.totalAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Slide-out Inspector Drawer matching MembersScreen */}
      {selectedSale && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={17} className="text-[#C4785A]" />
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                Receipt Audit Inspector
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
                  <span>TRANSACTION REFUNDED & RESTOCKED</span>
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-300">
                  {selectedSale.notes || 'Full refund processed. Inventory levels have been automatically returned to stock.'}
                </p>
              </div>
            )}

            {/* Top receipt overview */}
            <div className="p-4 rounded-2xl bg-[#FAF9F6] dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Receipt Ref:</span>
                <span className="font-mono font-bold text-[#C4785A]">#{selectedSale.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Timestamp:</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
                  {new Date(selectedSale.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Customer:</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {selectedSale.memberName || 'Guest Walk-In'}
                </span>
              </div>
              {selectedSale.customerPhone && (
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Phone:</span>
                  <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200">
                    {selectedSale.customerPhone}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Payment Tender:</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {selectedSale.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Facility Station:</span>
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
                  <span>Attribution / Notes</span>
                </span>
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  {selectedSale.notes}
                </p>
              </div>
            )}

            {/* Line Items breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                Line Items ({selectedSale.items.length})
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
                <span className="text-xs font-bold text-[#C4785A]">Total Settled</span>
                <div className="text-[11px] text-neutral-500">Includes VAT & taxes</div>
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
                  <span>Process Refund & Restock Items</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="w-full h-10 rounded-full border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors shadow-2xs"
              >
                <Printer size={15} />
                <span>Print Thermal Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                style={{ backgroundColor: 'var(--color-accent)' }}
                className="w-full h-10 rounded-full text-xs font-bold text-white flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity shadow-xs"
              >
                Close Inspector
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
                  Confirm Transaction Refund
                </h3>
                <p className="text-xs text-neutral-500">
                  Sale #{selectedSale.id} • {formatMoney(selectedSale.totalAmount)}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                Refunding will return all {selectedSale.items.reduce((s, i) => s + i.quantity, 0)} items back to available branch stock and create an audit log.
              </span>
            </div>

            <div>
              <LabelSelect
                field="RefundReason"
                label="Reason for Refund / Return *"
                value={refundReason}
                onChange={(val) => setRefundReason(val?.target?.value ?? String(val))}
                options={[
                  'Customer return / exchange',
                  'Wrong item rung up by cashier',
                  'Defective or damaged product',
                  'Customer changed mind before leaving',
                  'Pricing / discount adjustment',
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
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  refundSale(selectedSale.id, refundReason);
                  setRefundSuccessToast(`Refunded Sale #${selectedSale.id}. Items returned to inventory.`);
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
                Confirm Refund & Restock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
