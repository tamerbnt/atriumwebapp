import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Percent,
  TrendingUp,
  DollarSign,
  CreditCard,
  Building,
  ShieldCheck,
  X,
  FileText,
  AlertCircle,
  HelpCircle,
  Building2,
  ChevronDown,
  Check,
  Sparkles,
  Download,
  Trash2,
  Pin,
  CheckCircle2,
  Receipt,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatCurrencyAmount } from '../../../utils/rules';
import { FreelanceExpense, ExpenseCategory, CurrencyCode } from '../../../types/index';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { Seek } from '../../ui/Seek';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useTranslation } from '../../../utils/useTranslation';

export const FreelanceFinanceView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    freelanceInvoices,
    freelanceExpenses,
    timeLogs,
    addFreelanceExpense,
    deleteFreelanceExpense,
    businesses,
    branches,
    currentBusinessId,
    currentBusiness,
    switchBusiness,
    switchBranch,
    resetFreelanceMockData,
    showToast,
  } = useAtriumStore();

  const [taxRate, setTaxRate] = useState<number>(20); // 20% estimated tax provision
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Selection & Pinning State for UniversalDataCollection
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [pinnedExpenseIds, setPinnedExpenseIds] = useState<Set<string>>(new Set());
  const [expenseSortBy, setExpenseSortBy] = useState<string>('amount');
  const [expenseSortDir, setExpenseSortDir] = useState<'asc' | 'desc'>('desc');

  // Auto-heal if store empty
  useEffect(() => {
    if (freelanceExpenses.length === 0 && freelanceInvoices.length === 0) {
      resetFreelanceMockData?.();
    }
  }, [freelanceExpenses.length, freelanceInvoices.length, resetFreelanceMockData]);

  // New Expense Form
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Software');
  const [amount, setAmount] = useState(25);
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [isTaxDeductible, setIsTaxDeductible] = useState(true);

  // Currency breakdown for paid invoices
  const currencyTotals = useMemo(() => {
    const paid = freelanceInvoices.filter((i) => i.status === 'Paid');
    const eur = paid.filter((i) => i.currency === 'EUR').reduce((s, i) => s + i.totalAmount, 0);
    const usd = paid.filter((i) => i.currency === 'USD').reduce((s, i) => s + i.totalAmount, 0);
    const dzd = paid.filter((i) => i.currency === 'DZD').reduce((s, i) => s + i.totalAmount, 0);

    // Approximate EUR equivalent conversion for analytics (1 EUR = 1.08 USD, 1 EUR = 230 DZD)
    const totalEurEquiv = Math.round(eur + usd / 1.08 + dzd / 230);
    return { eur, usd, dzd, totalEurEquiv };
  }, [freelanceInvoices]);

  // Total expenses in EUR equivalent (approximate: 1 EUR = 1.08 USD, 1 EUR = 230 DZD)
  const totalExpensesEurEquiv = useMemo(() => {
    return Math.round(
      freelanceExpenses.reduce((sum, exp) => {
        if (exp.currency === 'EUR') return sum + exp.amount;
        if (exp.currency === 'USD') return sum + exp.amount / 1.08;
        return sum + exp.amount / 230;
      }, 0)
    );
  }, [freelanceExpenses]);

  // Net Profit & Tax Calculations
  const grossProfitEur = Math.max(0, currencyTotals.totalEurEquiv - totalExpensesEurEquiv);
  const taxReserveAmount = Math.round(grossProfitEur * (taxRate / 100));
  const netTakeHomeEur = grossProfitEur - taxReserveAmount;

  // Billable hours & Effective Hourly Rate (EHR)
  const totalBillableHours = Number(
    (
      timeLogs
        .filter((l) => l.isBillable)
        .reduce((sum, l) => sum + l.durationSeconds, 0) / 3600
    ).toFixed(1)
  );

  const grossEhr = totalBillableHours > 0 ? Math.round(currencyTotals.totalEurEquiv / totalBillableHours) : 85;
  const netEhr = totalBillableHours > 0 ? Math.round(netTakeHomeEur / totalBillableHours) : 60;

  // Filtered & Sorted Expenses
  const filteredExpenses = useMemo(() => {
    return freelanceExpenses.filter((exp) => {
      if (categoryFilter !== 'All' && exp.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesVendor = exp.vendor.toLowerCase().includes(q);
        const matchesDesc = exp.description.toLowerCase().includes(q);
        const matchesCategory = exp.category.toLowerCase().includes(q);
        if (!matchesVendor && !matchesDesc && !matchesCategory) return false;
      }
      return true;
    });
  }, [freelanceExpenses, categoryFilter, searchQuery]);

  const sortedExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => {
      const aPinned = pinnedExpenseIds.has(a.id);
      const bPinned = pinnedExpenseIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (expenseSortBy === 'vendor') {
        const cmp = a.vendor.localeCompare(b.vendor);
        return expenseSortDir === 'asc' ? cmp : -cmp;
      }
      if (expenseSortBy === 'category') {
        const cmp = a.category.localeCompare(b.category);
        return expenseSortDir === 'asc' ? cmp : -cmp;
      }
      if (expenseSortBy === 'amount') {
        return expenseSortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      if (expenseSortBy === 'date') {
        const dateA = new Date(a.date || '2026-01-01').getTime();
        const dateB = new Date(b.date || '2026-01-01').getTime();
        return expenseSortDir === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });
  }, [filteredExpenses, pinnedExpenseIds, expenseSortBy, expenseSortDir]);

  const handleTogglePinExpense = (exp: FreelanceExpense) => {
    setPinnedExpenseIds((prev) => {
      const next = new Set(prev);
      if (next.has(exp.id)) {
        next.delete(exp.id);
      } else {
        next.add(exp.id);
      }
      return next;
    });
  };

  const handleBatchDeleteExpenses = () => {
    const targetIds = Array.from(selectedExpenseIds);
    targetIds.forEach((id) => deleteFreelanceExpense(id));
    setSelectedExpenseIds(new Set());
    showToast?.({
      type: 'warning',
      title: language === 'ar' ? 'تم حذف المصاريف' : language === 'fr' ? 'Dépenses supprimées' : 'Expenses Removed',
      message: `${targetIds.length} ${language === 'ar' ? 'مصروف تم حذفه بنجاح' : language === 'fr' ? 'dépenses supprimées' : 'expenses removed'}.`,
    });
  };

  const handleExportCSV = () => {
    const headers = [
      language === 'ar' ? 'المورد / الخدمة' : language === 'fr' ? 'Fournisseur / Service' : 'Vendor',
      language === 'ar' ? 'الفئة' : language === 'fr' ? 'Catégorie' : 'Category',
      language === 'ar' ? 'الوصف' : language === 'fr' ? 'Description' : 'Description',
      language === 'ar' ? 'المبلغ' : language === 'fr' ? 'Montant' : 'Amount',
      language === 'ar' ? 'العملة' : language === 'fr' ? 'Devise' : 'Currency',
      language === 'ar' ? 'معفى ضريبياً' : language === 'fr' ? 'Déductible' : 'Tax Deductible',
      language === 'ar' ? 'التاريخ' : language === 'fr' ? 'Date' : 'Date',
    ];
    const rows = sortedExpenses.map((exp) => [
      `"${exp.vendor.replace(/"/g, '""')}"`,
      `"${exp.category}"`,
      `"${exp.description.replace(/"/g, '""')}"`,
      exp.amount,
      exp.currency,
      exp.isTaxDeductible ? 'Yes' : 'No',
      `"${exp.date || ''}"`,
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `atrium-expenses-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor.trim() || !description.trim()) return;

    addFreelanceExpense({
      vendor,
      description,
      category,
      amount: Number(amount),
      currency,
      date: new Date().toISOString().split('T')[0],
      isTaxDeductible,
    });

    setVendor('');
    setDescription('');
    setIsAddExpenseModalOpen(false);
  };

  // Columns for UniversalDataCollection
  const expenseColumns: ColumnDefinition<FreelanceExpense>[] = useMemo(() => [
    {
      key: 'vendor',
      header: t('free_fin_vendor_service', language),
      width: '2.5*',
      sortable: true,
      renderCell: (exp) => {
        const isPinned = pinnedExpenseIds.has(exp.id);
        return (
          <div className="flex items-center gap-3 min-w-0">
            {isPinned && <span className="w-1.5 h-6 rounded-full bg-[#C4785A] shrink-0" />}
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 font-bold text-xs shrink-0">
              {exp.vendor.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-neutral-900 dark:text-white truncate flex items-center gap-1.5">
                <span>{exp.vendor}</span>
                {isPinned && <Pin size={11} className="text-[#C4785A] shrink-0" />}
              </div>
              <div className="text-xs text-neutral-400 truncate">{exp.description}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'category',
      header: t('free_fin_expense_category', language),
      width: '1.8*',
      sortable: true,
      renderCell: (exp) => (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
          {exp.category}
        </span>
      ),
    },
    {
      key: 'amount',
      header: t('common_amount', language),
      width: '1.6*',
      sortable: true,
      renderCell: (exp) => (
        <div className="font-mono font-bold text-sm text-neutral-900 dark:text-white tabular-nums">
          {formatCurrencyAmount(exp.amount, exp.currency)}
        </div>
      ),
    },
    {
      key: 'date',
      header: language === 'ar' ? 'التاريخ' : language === 'fr' ? 'Date' : 'Date',
      width: '1.4*',
      sortable: true,
      renderCell: (exp) => (
        <span className="text-xs text-neutral-500 tabular-nums">
          {exp.date || '2026-02-15'}
        </span>
      ),
    },
    {
      key: 'deductible',
      header: t('free_fin_deductible', language),
      width: '1.4*',
      renderCell: (exp) => (
        exp.isTaxDeductible ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={13} />
            <span>{language === 'ar' ? 'معفى' : language === 'fr' ? 'Oui' : 'Deductible'}</span>
          </span>
        ) : (
          <span className="text-xs text-neutral-400">
            {language === 'ar' ? 'لا' : language === 'fr' ? 'Non' : 'No'}
          </span>
        )
      ),
    },
  ], [language, pinnedExpenseIds, t]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {t('free_fin_title', language)}
            </h1>
            <span className="text-xs text-neutral-500">
              {language === 'ar'
                ? 'تدفقات متعددة العملات، اشتراكات التشغيل وتقدير صافي الربح'
                : language === 'fr'
                ? 'Flux multi-devises, abonnements récurrents & prévision du revenu net'
                : 'Multi-currency cashflow, overhead subscriptions & net take-home forecast'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {t('free_fin_subtitle', language)}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Facility Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-3.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer shadow-2xs"
            >
              <Building2 size={14} className="text-[#C4785A]" />
              <span className="truncate max-w-[130px]">
                {currentBusiness?.name || 'Studio Main'}
              </span>
              <ChevronDown size={13} className="text-neutral-400" />
            </button>

            {isFacilityDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xl z-50 p-1.5 space-y-1">
                <div className="px-2.5 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  {t('hub_switch_business') || 'Espaces & Studios'}
                </div>
                {businesses.map((biz) => {
                  const isCurrent = biz.id === currentBusinessId;
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        switchBusiness(biz.id);
                        const firstBranch = branches.find((b) => b.businessId === biz.id);
                        if (firstBranch) switchBranch(firstBranch.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        isCurrent
                          ? 'bg-[#C4785A]/10 text-[#C4785A]'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
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

          {/* Demo Data Recharge Button */}
          <button
            type="button"
            onClick={() => resetFreelanceMockData?.()}
            className="h-10 px-3.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-[#C4785A] dark:hover:text-[#C4785A] text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer shadow-2xs"
            title={t('common_reset_demo') || 'Recharger Données Démo'}
          >
            <Sparkles size={14} className="text-[#C4785A]" />
            <span className="hidden sm:inline">{t('common_reset_demo') || 'Démo'}</span>
          </button>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="h-10 px-3.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer shadow-2xs"
            title="Export Expenses CSV"
          >
            <Download size={14} />
            <span className="hidden sm:inline">{language === 'ar' ? 'تصدير' : language === 'fr' ? 'Exporter' : 'Export'}</span>
          </button>

          {/* Add Expense Button */}
          <button
            type="button"
            onClick={() => setIsAddExpenseModalOpen(true)}
            className="h-10 px-4 rounded-full bg-[#C4785A] text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>{t('free_fin_btn_add_expense', language)}</span>
          </button>
        </div>
      </div>

      {/* Multi-Currency Inflow Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {language === 'ar' ? 'اليورو المحصّل (حساب SEPA)' : language === 'fr' ? 'EUR Encaissé (Virement SEPA)' : 'EUR Collected (SEPA Wire)'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              €{currencyTotals.eur.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'حساب بنكي أوروبي' : language === 'fr' ? 'Compte euro' : 'Euro account'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {language === 'ar' ? 'الدولار المحصّل (تحويل دولي)' : language === 'fr' ? 'USD Encaissé (Dépôt Direct)' : 'USD Collected (Direct Deposit)'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              ${currencyTotals.usd.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'تحويل بنكي أمريكي' : language === 'fr' ? 'Virement bancaire US' : 'US bank wire'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {language === 'ar' ? 'الدينار الجزائري (بريدي موب وحساب CCP)' : language === 'fr' ? 'DZD Encaissé (BaridiMob & Local)' : 'DZD Collected (BaridiMob & Local)'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#C4785A] tabular-nums">
              {currencyTotals.dzd.toLocaleString()} DZD
            </span>
            <span className="text-xs text-neutral-500">
              {language === 'ar' ? 'دينار جزائري' : language === 'fr' ? 'Dinars algériens' : 'Algerian Dinars'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-Time Net Take-Home & Tax Reserve Gauge */}
      <div className="p-6 rounded-3xl bg-neutral-900 dark:bg-black text-white border border-neutral-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              <ShieldCheck size={14} className="text-[#C4785A]" />
              <span>
                {language === 'ar' ? 'الاحتياطي الضريبي ومحاكاة الأرباح الصافية' : language === 'fr' ? 'Provision fiscale & Simulation du bénéfice net' : 'Tax Reserve & Net Earnings Simulation'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              {t('free_fin_net_income', language)}: <span className="text-emerald-400 font-mono tabular-nums">€{netTakeHomeEur.toLocaleString()}</span>
            </h2>
          </div>

          <div className={isRtl ? 'text-left' : 'text-right'}>
            <span className="text-xs text-neutral-400 block">{t('free_fin_tax_reserve', language)}</span>
            <span className="text-lg font-bold text-amber-400 font-mono tabular-nums">
              €{taxReserveAmount.toLocaleString()} ({taxRate}%)
            </span>
          </div>
        </div>

        {/* Interactive Tax Percentage Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-300">
            <span>
              {language === 'ar' ? 'معدل الضريبة التقديري والاشتراكات' : language === 'fr' ? 'Curseur de taux d\'imposition estimé' : 'Local / Flat Tax Rate Slider'}
            </span>
            <span className="font-bold font-mono text-[#C4785A] tabular-nums">{taxRate}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="35"
            step="1"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
            className="w-full accent-[#C4785A] h-2 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
            <span>0% ({t('free_fin_tax_exempt_label', language)})</span>
            <span>10% ({t('free_fin_tax_auto_entrepreneur_label', language)})</span>
            <span>20% ({t('free_fin_tax_standard_solo_label', language)})</span>
            <span>35% ({t('free_fin_tax_high_bracket_label', language)})</span>
          </div>
        </div>

        {/* 3-Column Profit Bridge Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-neutral-800 text-xs">
          <div>
            <span className="text-neutral-400 block">
              {t('free_fin_gross_revenue_equiv', language)}
            </span>
            <span className="text-base font-bold font-mono text-white tabular-nums">
              €{currencyTotals.totalEurEquiv.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-neutral-400 block">{t('free_fin_expenses_total', language)}</span>
            <span className="text-base font-bold font-mono text-rose-400 tabular-nums">
              -€{totalExpensesEurEquiv.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-neutral-400 block">
              {t('free_fin_net_hourly_yield', language)}
            </span>
            <span className="text-base font-bold font-mono text-emerald-400 tabular-nums">
              €{netEhr}{t('free_dash_per_hour', language)} ({t('free_fin_gross_label', language)} €{grossEhr}{t('free_dash_per_hour', language)})
            </span>
          </div>
        </div>
      </div>

      {/* Overhead & Subscriptions Ledger Table with UniversalDataCollection */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Table Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-[#C4785A]" />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {t('free_fin_operational_overhead', language)}
            </span>
            <span className="text-xs text-neutral-400 font-semibold tabular-nums ml-1">
              ({sortedExpenses.length}) · ~€{totalExpensesEurEquiv.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('free_fin_ph_vendor', language) || 'Search vendor...'}
              shutSize={36}
              openWidth={220}
            />

            <LabelSelect
              field="Category"
              label={t('free_fin_expense_category', language)}
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val?.target?.value ?? String(val))}
              options={[
                { value: 'All', label: language === 'ar' ? 'جميع الفئات' : language === 'fr' ? 'Toutes les catégories' : 'All Categories' },
                { value: 'Software', label: t('free_fin_expense_software', language) },
                { value: 'Office', label: t('free_fin_expense_workspace', language) },
                { value: 'Hardware', label: t('free_fin_expense_hardware', language) },
                { value: 'Subcontractor', label: t('free_fin_expense_subcontractor', language) },
                { value: 'Travel', label: t('free_fin_expense_travel', language) },
                { value: 'Other', label: t('free_fin_expense_other', language) },
              ]}
              width={160}
              height={36}
              corner={18}
            />
          </div>
        </div>

        {/* Floating Batch Action Toolbar */}
        {selectedExpenseIds.size > 0 && (
          <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-neutral-900 text-white shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="px-2 py-0.5 rounded-full bg-[#C4785A] text-white font-bold text-[11px]">
                {selectedExpenseIds.size}
              </span>
              <span>{language === 'ar' ? 'مصاريف محددة' : language === 'fr' ? 'charges sélectionnées' : 'expenses selected'}</span>
              <button
                type="button"
                onClick={() => setSelectedExpenseIds(new Set())}
                className="text-neutral-400 hover:text-white underline text-xs cursor-pointer ml-1"
              >
                {language === 'ar' ? 'إلغاء التحديد' : language === 'fr' ? 'Désélectionner' : 'Deselect all'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchDeleteExpenses}
                className="h-8 px-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>{language === 'ar' ? 'حذف المحدد' : language === 'fr' ? 'Supprimer' : 'Batch Delete'}</span>
              </button>
            </div>
          </div>
        )}

        <UniversalDataCollection<FreelanceExpense>
          items={sortedExpenses}
          keyExtractor={(exp) => exp.id}
          columns={expenseColumns}
          selectedIds={selectedExpenseIds}
          onSelectionChange={setSelectedExpenseIds}
          isPinned={(exp) => pinnedExpenseIds.has(exp.id)}
          onTogglePin={handleTogglePinExpense}
          onDelete={(exp) => deleteFreelanceExpense(exp.id)}
          sortBy={expenseSortBy}
          sortDirection={expenseSortDir}
          onSortChange={(colKey) => {
            if (expenseSortBy === colKey) {
              setExpenseSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
            } else {
              setExpenseSortBy(colKey);
              setExpenseSortDir('desc');
            }
          }}
          showViewToggle={true}
          emptyTitle={t('free_fin_empty_expenses', language)}
          emptyDescription={t('free_fin_empty_expenses_desc', language)}
          renderCard={(exp) => {
            const isPinned = pinnedExpenseIds.has(exp.id);
            return (
              <div
                key={exp.id}
                className="p-5 rounded-[22px] border border-[#E9EEF0] dark:border-neutral-700/60 bg-white dark:bg-neutral-800 shadow-2xs relative space-y-3"
              >
                {isPinned && (
                  <div className="absolute top-3 left-3 text-[#C4785A]">
                    <Pin size={12} className="fill-[#C4785A]" />
                  </div>
                )}

                <div className="flex items-center justify-between pl-4">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                    {exp.category}
                  </span>
                  <span className="text-xs text-neutral-400 tabular-nums">{exp.date || '2026-02-15'}</span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-neutral-900 dark:text-white">{exp.vendor}</h4>
                  <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{exp.description}</p>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between">
                  <span className="font-mono text-base font-black text-[#C4785A] tabular-nums">
                    {formatCurrencyAmount(exp.amount, exp.currency)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {exp.isTaxDeductible && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        Deductible
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteFreelanceExpense(exp.id)}
                      className="p-1 text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        />
      </div>

      {/* Add Expense Modal */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {t('free_fin_modal_expense_title', language)}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddExpenseModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <LabelInput
                    field="Vendor"
                    label={`${t('free_fin_vendor_label', language)} *`}
                    required
                    placeholder={t('free_fin_ph_vendor', language)}
                    value={vendor}
                    onChange={setVendor}
                    width="100%"
                    height={46}
                    corner={14}
                  />
                </div>
                <LabelSelect
                  field="Category"
                  label={`${t('free_fin_expense_category', language)} *`}
                  value={category}
                  onChange={(val) =>
                    setCategory((val?.target?.value ?? String(val)) as ExpenseCategory)
                  }
                  options={[
                    { value: 'Software', label: t('free_fin_expense_software', language) },
                    { value: 'Office', label: t('free_fin_expense_workspace', language) },
                    { value: 'Hardware', label: t('free_fin_expense_hardware', language) },
                    { value: 'Subcontractor', label: t('free_fin_expense_subcontractor', language) },
                    { value: 'Travel', label: t('free_fin_expense_travel', language) },
                    { value: 'Other', label: t('free_fin_expense_other', language) },
                  ]}
                  height={46}
                  corner={14}
                />
              </div>

              <div>
                <LabelInput
                  field="Description"
                  label={`${t('free_fin_expense_desc', language)} *`}
                  required
                  placeholder={t('free_fin_ph_expense_desc_full', language)}
                  value={description}
                  onChange={setDescription}
                  width="100%"
                  height={46}
                  corner={14}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <LabelInput
                    field="Amount"
                    label={`${t('common_amount', language)} *`}
                    type="number"
                    required
                    value={String(amount)}
                    onChange={(val) => setAmount(Number(val))}
                    width="100%"
                    height={46}
                    corner={14}
                  />
                </div>
                <LabelSelect
                  field="Currency"
                  label={`${t('common_currency', language)} *`}
                  value={currency}
                  onChange={(val) =>
                    setCurrency((val?.target?.value ?? String(val)) as CurrencyCode)
                  }
                  options={[
                    { value: 'EUR', label: 'EUR (€)' },
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'DZD', label: 'DZD (DA)' },
                  ]}
                  height={46}
                  corner={14}
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-700 dark:text-neutral-300 font-medium">
                  <input
                    type="checkbox"
                    checked={isTaxDeductible}
                    onChange={(e) => setIsTaxDeductible(e.target.checked)}
                    className="rounded text-[#C4785A] focus:ring-0"
                  />
                  <span>{t('free_fin_tax_deductible_prompt', language)}</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="h-10 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  {t('action_cancel', language)}
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-[#C4785A] text-white font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('free_fin_btn_save_expense', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
