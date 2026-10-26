import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Maximize2,
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

  // Auto-heal empty caution escrow records safely once on mount if empty
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

  const filteredDeposits = useMemo(() => {
    return securityDeposits.filter((d) => {
      const matchesSearch =
        d.renterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.deductionReason && d.deductionReason.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [securityDeposits, searchQuery, statusFilter]);

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="space-y-6">
      {/* Outer Workspace Panel matching Desktop Spec */}
      <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs">
        {/* Row 0: Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                {t('venue_fin_page_title')}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t('venue_fin_page_sub')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative flex-wrap">
            {/* Facility Pill: Atrium 1 ▾ */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
                className="h-10 px-4 rounded-xl bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
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

            {/* Seed Demo Data Button */}
            <AtriumButton
              type="button"
              variant="outline"
              size="sm"
              icon={<Sparkles size={14} className="text-[#C4785A]" />}
              onClick={resetVenueMockData}
              title={language === 'ar' ? 'إعادة شحن بيانات تجريبية' : language === 'fr' ? 'Recharger Données Démo' : 'Seed Mock Data'}
            >
              <span className="hidden sm:inline">{language === 'ar' ? 'بيانات تجريبية' : language === 'fr' ? 'Données Démo' : 'Demo Data'}</span>
            </AtriumButton>

            {/* Export CSV Button */}
            <AtriumButton
              type="button"
              variant="secondary"
              onClick={handleExportCautionCSV}
              icon={<Download size={14} />}
              size="sm"
            >
              <span className="hidden sm:inline">CSV</span>
            </AtriumButton>
          </div>
        </div>

        {/* Row 1: Top Metrics Pod Tray matching Staff Management Screenshot 30 */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'الودائع الضامنة & سيولة الحسابات' : language === 'fr' ? 'Trésorerie & Séquestre des Cautions' : 'Escrow Deposits & Venue Liquidity'}
            </h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {language === 'ar'
                ? 'متابعة أموال التأمين المحجوزة، مبالغ الإرجاع والاقتطاعات القانونية'
                : language === 'fr'
                ? 'Suivi des cautions bloquées, restitutions effectuées et retenues sur dégradations'
                : 'Escrow reserves held in trust, refunded deposits, and damage retentions'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tile 1: Total Gross Venue Revenue — Pure White Card */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div>
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  {t('venue_fin_kpi_gross_rev')}
                </span>
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    ↗ {rentalBookings.length} {language === 'ar' ? 'عقود' : 'dossiers'}
                  </span>
                </div>
              </div>
              <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                {formatCurrencyAmount(totalBookingRevenue, 'DZD')}
              </div>
            </div>

            {/* Tile 2: Released Cautions / Refunds — Pure White Card */}
            <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
              <div>
                <span className="text-xs font-semibold text-[#64748B] dark:text-neutral-400">
                  {t('venue_fin_kpi_released')}
                </span>
                <div className="mt-1">
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                    ✓ {language === 'ar' ? 'مستردة بالكامل' : 'Restitué'}
                  </span>
                </div>
              </div>
              <div className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                {formatCurrencyAmount(totalReleased, 'DZD')}
              </div>
            </div>

            {/* Tile 3: DARK ESPRESSO CARD (#1F1D1B) — Held Caution Escrow */}
            <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
              <div>
                <span className="text-xs font-medium text-neutral-300">
                  {t('venue_fin_kpi_escrow')}
                </span>
                <div className="text-[11px] text-[#FB923C] font-semibold mt-0.5">
                  <span className="bg-[#3D2817] px-2 py-0.5 rounded-full inline-block">
                    {totalHeldCount} {language === 'ar' ? 'ودائع محجوزة' : 'cautions actives'}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-black text-white tabular-nums font-mono">
                {formatCurrencyAmount(totalHeld, 'DZD')}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Bottom Collection Pod Tray matching Staff Management Screenshot 30 */}
        <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
          {/* Integrated Toolbar Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Icon + Title + Count Badge */}
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-neutral-500" />
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'سجل الودائع الضامنة' : language === 'fr' ? 'Registre des Cautions' : 'Caution Escrow Register'}
              </span>
              <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
                {filteredDeposits.length}
              </span>
            </div>

            {/* Right: Seek, Capsules, Fullscreen */}
            <div className="flex flex-wrap items-center gap-2.5 ml-auto">
              {/* Expanding Seek Search Box */}
              <Seek
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('venue_fin_search_ph')}
                shutSize={36}
                openWidth={220}
              />

              {/* Status Filter Capsules */}
              <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 p-0.5 rounded-xl shadow-2xs overflow-x-auto max-w-full">
                {[
                  { id: 'All' as const, label: t('venue_fin_tab_all') },
                  { id: 'Held' as const, label: t('venue_fin_tab_held') },
                  { id: 'Released' as const, label: t('venue_fin_tab_released') },
                  { id: 'Deducted' as const, label: t('venue_fin_tab_deducted') },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStatusFilter(item.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      statusFilter === item.id
                        ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold shadow-2xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Fullscreen Expand Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="h-9 w-9 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                title="Fullscreen"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          </div>

          {/* Sticky Column Headers Card */}
          <div className="w-full bg-white dark:bg-neutral-800 border border-neutral-200/90 dark:border-neutral-700/80 rounded-[12px] px-4 py-2.5 flex items-center text-xs font-semibold text-neutral-500 dark:text-neutral-400 shadow-2xs">
            <span className="w-[30%] truncate">{t('venue_voucher_renter_name')}</span>
            <span className="w-[20%] truncate">{t('venue_voucher_space')}</span>
            <span className="w-[15%] truncate">{t('venue_col_financials')}</span>
            <span className="w-[15%] truncate">{language === 'ar' ? 'طريقة الدفع' : 'Méthode'}</span>
            <span className="w-[10%] text-center truncate">{t('venue_col_status')}</span>
            <span className="w-[10%] text-right rtl:text-left truncate">{language === 'ar' ? 'الإجراء' : 'Actions'}</span>
          </div>

          {/* List of Escrow Row Cards */}
          <div className="space-y-2">
            {filteredDeposits.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-neutral-800/40 rounded-[16px] border border-[#E9EEF0] dark:border-neutral-700/60 text-neutral-400 text-xs">
                {t('venue_fin_no_records')}
              </div>
            ) : (
              filteredDeposits.map((dep) => (
                <div
                  key={dep.id}
                  className="bg-white dark:bg-neutral-800 border border-neutral-200/90 dark:border-neutral-700/80 rounded-[12px] px-4 py-3 hover:bg-[#F8F9FA] dark:hover:bg-neutral-700/40 transition-colors flex items-center text-xs shadow-2xs"
                >
                  <div className="w-[30%] min-w-0 pr-2">
                    <div className="font-bold text-neutral-900 dark:text-white truncate">
                      {dep.renterName}
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      {dep.collectedAt}
                    </div>
                  </div>

                  <div className="w-[20%] font-medium text-neutral-700 dark:text-neutral-300 truncate pr-2">
                    {dep.unitName}
                  </div>

                  <div className="w-[15%] font-bold text-neutral-900 dark:text-white tabular-nums font-mono">
                    {formatCurrencyAmount(dep.amount, dep.currency)}
                  </div>

                  <div className="w-[15%] text-neutral-500 dark:text-neutral-400 text-[11px] truncate">
                    {dep.paymentMethod}
                  </div>

                  <div className="w-[10%] text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        dep.status === 'Held'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : dep.status === 'Released'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                      }`}
                    >
                      {dep.status === 'Held'
                        ? t('venue_held_status')
                        : dep.status === 'Released'
                        ? t('venue_refunded_status')
                        : t('venue_deducted_status')}
                    </span>
                  </div>

                  <div className="w-[10%] flex items-center justify-end gap-1.5">
                    {dep.status === 'Held' && (
                      <>
                        <button
                          type="button"
                          onClick={() => releaseSecurityDeposit(dep.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                          title={t('venue_fin_btn_release')}
                        >
                          {language === 'ar' ? 'إرجاع' : language === 'fr' ? 'Restituer' : 'Release'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeduct(dep)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                          title={t('venue_fin_btn_deduct')}
                        >
                          {language === 'ar' ? 'اقتطاع' : language === 'fr' ? 'Retenue' : 'Deduct'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Count matching Screenshot 30 */}
          <div className="pt-2 text-center text-xs text-neutral-400 font-medium">
            {filteredDeposits.length} {language === 'ar' ? 'ودائع ضامنة معروضة' : language === 'fr' ? 'cautions affichées' : 'escrow deposits displayed'}
          </div>
        </div>
      </div>

      {/* Deduct Caution Modal */}
      {deductionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-700 pb-3">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {t('venue_fin_btn_deduct')}
              </h3>
              <button
                type="button"
                onClick={() => setDeductionTarget(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleConfirmDeduct} className="space-y-4 text-xs">
              <div className="p-3 bg-[#F8F9FA] dark:bg-neutral-700/40 rounded-xl space-y-1">
                <div className="text-neutral-500">Locataire: <span className="font-bold text-neutral-800 dark:text-neutral-200">{deductionTarget.renterName}</span></div>
                <div className="text-neutral-500">Caution Initiale: <span className="font-mono font-bold text-emerald-600">{formatCurrencyAmount(deductionTarget.amount, deductionTarget.currency)}</span></div>
              </div>

              <LabelInput
                label="Montant de la Retenue (DZD) *"
                type="number"
                min={1}
                max={deductionTarget.amount}
                value={deductionAmount}
                onChange={(e) => setDeductionAmount(Number(e.target.value))}
                required
              />

              <LabelInput
                label="Motif de la Dégradation / Pénalité *"
                placeholder="e.g. Nettoyage exceptionnel ou dégâts matériels..."
                value={deductionReason}
                onChange={(e) => setDeductionReason(e.target.value)}
                required
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setDeductionTarget(null)}
                  className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer font-semibold"
                >
                  Annuler
                </button>
                <AtriumButton
                  type="submit"
                  variant="primary"
                  icon={<AlertTriangle size={14} />}
                >
                  Confirmer la Retenue
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
