import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileText,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  X,
  CreditCard,
  Banknote,
  Download,
  Sparkles,
  Home,
  ChevronDown,
  Check,
  Building2,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { SecurityDepositRecord } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { AtriumButton } from '../../ui/AtriumButton';

export const VenueFinanceView: React.FC = () => {
  const { t, language } = useTranslation();
  const {
    securityDeposits,
    rentalBookings,
    releaseSecurityDeposit,
    deductSecurityDeposit,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    switchBusiness,
    switchBranch,
    resetVenueMockData,
    showToast,
  } = useAtriumStore();

  // Auto-heal empty caution escrow records safely once on mount
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    if (!hasAutoHealed.current && (securityDeposits.length === 0 || rentalBookings.length === 0)) {
      hasAutoHealed.current = true;
      resetVenueMockData();
    }
  }, [securityDeposits.length, rentalBookings.length, resetVenueMockData]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Held' | 'Released' | 'Deducted'>('All');
  const [deductionTarget, setDeductionTarget] = useState<SecurityDepositRecord | null>(null);
  const [deductionReason, setDeductionReason] = useState('');
  const [deductionAmount, setDeductionAmount] = useState<number>(0);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);

  const handleExportCautionCSV = () => {
    if (securityDeposits.length === 0) {
      showToast({
        type: 'warning',
        title: 'CSV Export',
        message: 'No security deposit records to export.',
        category: 'rental_booking',
      });
      return;
    }
    const headers = [
      'Deposit ID',
      'Booking ID',
      'Renter Name',
      'Space / Unit',
      'Amount (DZD)',
      'Payment Method',
      'Status',
      'Retention Reason',
      'Collected Date',
      'Released Date',
    ];
    const rows = filteredDeposits.map((dep) => [
      `"${dep.id}"`,
      `"${dep.bookingId}"`,
      `"${dep.renterName.replace(/"/g, '""')}"`,
      `"${dep.unitName.replace(/"/g, '""')}"`,
      dep.amount,
      `"${dep.paymentMethod}"`,
      `"${dep.status}"`,
      `"${(dep.deductionReason || '').replace(/"/g, '""')}"`,
      `"${dep.collectedAt}"`,
      `"${dep.releasedAt || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `atrium_caution_escrow_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({
      type: 'success',
      title: 'CSV Exported',
      message: `${filteredDeposits.length} caution deposits exported successfully.`,
      category: 'rental_booking',
    });
  };

  // Financial aggregates
  const totalHeldCount = securityDeposits.filter((d) => d.status === 'Held').length;
  const totalHeld = securityDeposits
    .filter((d) => d.status === 'Held')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalReleased = securityDeposits
    .filter((d) => d.status === 'Released')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalDeducted = securityDeposits
    .filter((d) => d.status === 'Deducted')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalBookingRevenue = rentalBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalAddonsRevenue = rentalBookings.reduce((sum, b) => sum + b.addonsAmount, 0);

  const filteredDeposits = securityDeposits.filter((d) => {
    const matchesSearch =
      d.renterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.deductionReason && d.deductionReason.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenDeduct = (dep: SecurityDepositRecord) => {
    setDeductionTarget(dep);
    setDeductionAmount(dep.amount);
    setDeductionReason('');
  };

  const handleConfirmDeduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductionTarget || !deductionReason.trim()) return;

    deductSecurityDeposit(deductionTarget.id, deductionReason.trim(), deductionAmount);
    setDeductionTarget(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {t('venue_fin_page_title')}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {t('venue_fin_page_sub')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* Facility Pill: Atrium 1 ▾ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Home size={15} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || 'Palais Central Complex'}
              </span>
              <ChevronDown
                size={14}
                className={`text-neutral-500 transition-transform ${
                  isFacilityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Facility Dropdown Menu */}
            {isFacilityDropdownOpen && (
              <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {language === 'ar' ? 'الفروع والمرافق' : language === 'fr' ? 'Succursales & Sites' : 'Branches & Venues'}
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
                      className={`w-full px-3 py-2 text-left rtl:text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
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

          {/* Export CSV Button */}
          <AtriumButton
            variant="secondary"
            onClick={handleExportCautionCSV}
            icon={<Download size={14} />}
            size="sm"
          >
            <span className="hidden sm:inline">CSV</span>
          </AtriumButton>

          {/* Seed Demo Data Button */}
          <AtriumButton
            variant="secondary"
            onClick={resetVenueMockData}
            icon={<Sparkles size={14} />}
            size="sm"
          >
            <span className="hidden sm:inline">{language === 'ar' ? 'بيانات تجريبية' : language === 'fr' ? 'Données Démo' : 'Demo Data'}</span>
          </AtriumButton>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('venue_fin_kpi_escrow')}</span>
            <ShieldCheck size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(totalHeld, 'DZD')}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {t('venue_fin_kpi_escrow_sub', { count: totalHeldCount })}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('venue_fin_kpi_released')}</span>
            <CheckCircle2 size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(totalReleased, 'DZD')}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {t('venue_fin_kpi_released_sub')}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('venue_fin_kpi_deducted')}</span>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(totalDeducted, 'DZD')}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {t('venue_fin_kpi_deducted_sub')}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">{t('venue_fin_kpi_gross_rev')}</span>
            <TrendingUp size={18} className="text-[var(--color-accent)]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(totalBookingRevenue, 'DZD')}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            {t('venue_fin_kpi_gross_rev_sub')}
          </div>
        </div>
      </div>

      {/* Caution Escrow Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('venue_search_bookings_placeholder', 'Search caution deposits by renter or space...')}
            openWidth={320}
            shutSize={40}
          />

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {(['All', 'Held', 'Released', 'Deducted'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === s
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                }`}
              >
                {s === 'All'
                  ? t('venue_fin_filter_all')
                  : s === 'Held'
                  ? t('venue_fin_filter_held')
                  : s === 'Released'
                  ? t('venue_fin_filter_released')
                  : t('venue_fin_filter_deducted')}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800/60 rounded-3xl border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E9EEF0] dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-800/80 text-neutral-500 font-medium">
                  <th className="py-3 px-4 rtl:text-right">{t('venue_fin_col_renter')}</th>
                  <th className="py-3 px-4 rtl:text-right">{t('venue_fin_col_amount')}</th>
                  <th className="py-3 px-4 rtl:text-right">{t('shop_cashier', 'Method')}</th>
                  <th className="py-3 px-4 rtl:text-right">{t('venue_fin_col_date')}</th>
                  <th className="py-3 px-4 rtl:text-right">{t('venue_fin_col_status')} & {t('venue_fin_col_retention_reason')}</th>
                  <th className="py-3 px-4 text-right rtl:text-left">{t('venue_fin_col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-800">
                {filteredDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400">
                      {t('venue_no_caution_held', 'No security deposit records found.')}
                    </td>
                  </tr>
                ) : (
                  filteredDeposits.map((dep) => (
                    <tr
                      key={dep.id}
                      className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-neutral-900 dark:text-white">
                          {dep.renterName}
                        </div>
                        <div className="text-[11px] text-neutral-400">{dep.unitName}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-neutral-900 dark:text-white tabular-nums">
                        {formatCurrencyAmount(dep.amount, dep.currency)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[11px]">
                          {dep.paymentMethod === 'Cash' && <Banknote size={12} />}
                          {dep.paymentMethod === 'Card' && <CreditCard size={12} />}
                          {dep.paymentMethod === 'Cash'
                            ? (language === 'ar' ? 'نقداً' : language === 'fr' ? 'Espèces' : 'Cash')
                            : dep.paymentMethod === 'Card'
                            ? (language === 'ar' ? 'بطاقة' : language === 'fr' ? 'Carte' : 'Card')
                            : dep.paymentMethod}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-neutral-600 dark:text-neutral-400">
                        {dep.collectedAt.split('T')[0]}
                      </td>

                      <td className="py-3.5 px-4 max-w-[220px]">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            dep.status === 'Held'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : dep.status === 'Released'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          }`}
                        >
                          {dep.status === 'Held'
                            ? t('venue_held_status')
                            : dep.status === 'Released'
                            ? t('venue_refunded_status')
                            : t('venue_deducted_status')}
                        </span>
                        {dep.deductionReason && (
                          <p className="text-[11px] text-red-500 mt-1 line-clamp-2">
                            {dep.deductionReason}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right rtl:text-left whitespace-nowrap">
                        {dep.status === 'Held' ? (
                          <div className="flex items-center justify-end rtl:justify-start gap-1.5">
                            <button
                              onClick={() => releaseSecurityDeposit(dep.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              {t('venue_fin_btn_release')}
                            </button>
                            <button
                              onClick={() => handleOpenDeduct(dep)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              {t('venue_fin_btn_deduct')}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-400 italic">
                            {dep.releasedAt ? dep.releasedAt.split('T')[0] : t('status_completed')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Deduction Modal */}
      {deductionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {t('venue_fin_deduct_modal_title')}
              </h3>
              <button
                onClick={() => setDeductionTarget(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmDeduct} className="space-y-3 text-xs">
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {t('venue_fin_deduct_modal_desc')}
              </p>

              <div>
                <LabelInput
                  id="deduction-amount"
                  label={t('venue_fin_deduct_field_amount')}
                  type="number"
                  max={deductionTarget.amount}
                  min={100}
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(Number(e.target.value))}
                  required
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  {formatCurrencyAmount(deductionTarget.amount, deductionTarget.currency)}
                </span>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {t('venue_fin_deduct_field_reason')}
                </label>
                <textarea
                  rows={3}
                  value={deductionReason}
                  onChange={(e) => setDeductionReason(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setDeductionTarget(null)}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-900 cursor-pointer"
                >
                  {t('action_cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl cursor-pointer"
                >
                  {t('venue_fin_deduct_btn_confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
