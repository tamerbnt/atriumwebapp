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
import { AtriumButton } from '../../ui/AtriumButton';
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
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
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
      {/* Row 0: Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#C4785A]/10 text-[#C4785A] flex items-center justify-center shrink-0">
            <Wallet size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {t('free_fin_title', language)}
              </h1>
              <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold">
                €{currencyTotals.totalEurEquiv.toLocaleString()} {language === 'ar' ? 'إجمالي الدخل' : 'total'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t('free_fin_subtitle', language)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Branch Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-[42px] px-4 rounded-[14px] bg-[#F8F9FA] dark:bg-neutral-800 border border-[#EDF1F3] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors shadow-2xs"
            >
              <Building2 size={15} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBusiness?.name || 'Studio Main'}
              </span>
              <ChevronDown
                size={14}
                className={`text-neutral-500 transition-transform ${isFacilityDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isFacilityDropdownOpen && (
              <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {language === 'ar' ? 'الفروع والمراكز' : language === 'fr' ? 'Établissements & Espaces' : 'Facilities & Branches'}
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

          {/* Quick Actions Terracotta Button + Floating Popup */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
              className="h-[42px] px-5 rounded-[14px] bg-[#C4785A] hover:bg-[#B3684A] text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <Plus size={15} />
              <span>{language === 'ar' ? 'إجراءات سريعة' : language === 'fr' ? 'Actions Rapides' : 'Quick Actions'}</span>
            </button>

            {isQuickActionsOpen && (
              <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-[240px] rounded-[18px] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {language === 'ar' ? 'إجراءات سريعة' : language === 'fr' ? 'Actions Rapides' : 'Quick Actions'}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    setIsAddExpenseModalOpen(true);
                  }}
                  className="w-full h-10 px-2.5 rounded-xl hover:bg-[#F8F9FA] dark:hover:bg-neutral-700 flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer text-left rtl:text-right"
                >
                  <div className="w-[30px] h-[30px] rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center shrink-0">
                    <Plus size={15} />
                  </div>
                  <span>{t('free_fin_btn_add_expense', language)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    handleExportCSV();
                  }}
                  className="w-full h-10 px-2.5 rounded-xl hover:bg-[#F8F9FA] dark:hover:bg-neutral-700 flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer text-left rtl:text-right"
                >
                  <div className="w-[30px] h-[30px] rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0">
                    <Download size={15} />
                  </div>
                  <span>{language === 'ar' ? 'تصدير CSV' : language === 'fr' ? 'Exporter CSV' : 'Export CSV'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    resetFreelanceMockData?.();
                  }}
                  className="w-full h-10 px-2.5 rounded-xl hover:bg-[#F8F9FA] dark:hover:bg-neutral-700 flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 font-medium transition-colors cursor-pointer text-left rtl:text-right"
                >
                  <div className="w-[30px] h-[30px] rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                    <Sparkles size={15} />
                  </div>
                  <span>{language === 'ar' ? 'إعادة ضبط البيانات' : 'Reset Demo Data'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Metrics Pod Tray: 3 Inset Cards including Dark Espresso Card */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div>
          <h2 className="text-[13.5px] font-semibold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'ملخص السيولة والتدفقات المالية' : language === 'fr' ? 'Trésorerie & Encaissements Multi-Devises' : 'Cashflow & Revenue Overview'}
          </h2>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {language === 'ar' ? 'حسابات بنكية متعددة العملات مع محاكاة تقديرية لصافي الأرباح بعد الضريبة' : language === 'fr' ? 'Comptes multi-devises et projection nette après charges et fiscalité' : 'Multi-currency revenue streams and net take-home forecast'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: EUR Inflow */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {language === 'ar' ? 'اليورو المحصّل (حساب SEPA)' : language === 'fr' ? 'EUR Encaissé (Virement SEPA)' : 'EUR Collected'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                SEPA Wire
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-neutral-900 dark:text-white font-mono tabular-nums">
                €{currencyTotals.eur.toLocaleString()}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                {language === 'ar' ? 'عملاء أوروبا ومشاريع الريموت' : 'Clients européens & missions remote'}
              </p>
            </div>
          </div>

          {/* Card 2: USD & DZD Inflows */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[124px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                {language === 'ar' ? 'الدولار والدينار الجزائري' : language === 'fr' ? 'USD & DZD Encaissés' : 'USD & Local Cash'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                BaridiMob / Direct
              </span>
            </div>
            <div>
              <div className="text-xl font-black text-neutral-900 dark:text-white font-mono tabular-nums">
                ${currencyTotals.usd.toLocaleString()} <span className="text-xs font-normal text-neutral-400">/</span> {currencyTotals.dzd.toLocaleString()} DZD
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                {language === 'ar' ? 'تحويلات أمريكية وحسابات CCP المحلية' : 'Virements directs US & encaissements locaux'}
              </p>
            </div>
          </div>

          {/* Card 3: DARK ESPRESSO CARD (#1F1D1B) */}
          <div className="p-5 rounded-[20px] bg-[#1F1D1B] border border-neutral-800 text-white flex flex-col justify-between h-[124px] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-neutral-300">
                {language === 'ar' ? 'صافي الدخل التقديري' : language === 'fr' ? 'Bénéfice Net Projeté' : 'Net Take-Home'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3D2817] text-[#FB923C] border border-[#FB923C]/30">
                {taxRate}% {language === 'ar' ? 'احتياطي' : 'provision'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-black text-[#FB923C] font-mono tabular-nums">
                €{netTakeHomeEur.toLocaleString()}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" />
                <span>{language === 'ar' ? `احتياطي ضريبي: €${taxReserveAmount.toLocaleString()}` : `Provision fiscale: €${taxReserveAmount.toLocaleString()}`}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Studio Profit Bridge & Tax Reserve Simulator Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#C4785A]" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
              {language === 'ar' ? 'الاحتياطي الضريبي ومحاكاة الأرباح الصافية' : language === 'fr' ? 'Provision Fiscale & Simulation du Bénéfice Net' : 'Tax Reserve & Net Earnings Simulation'}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-neutral-500">{t('free_fin_tax_reserve', language)}:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">€{taxReserveAmount.toLocaleString()} ({taxRate}%)</span>
          </div>
        </div>

        {/* Interactive Tax Percentage Slider */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-700 dark:text-neutral-300">
            <span className="font-medium">
              {language === 'ar' ? 'معدل الضريبة التقديري والاشتراكات الاجتماعية' : language === 'fr' ? 'Curseur de taux d\'imposition estimé' : 'Tax Rate & Social Contributions Slider'}
            </span>
            <span className="font-bold font-mono text-[#C4785A] text-sm tabular-nums">{taxRate}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="35"
            step="1"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
            className="w-full accent-[#C4785A] h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
            <span>0% ({t('free_fin_tax_exempt_label', language)})</span>
            <span>10% ({t('free_fin_tax_auto_entrepreneur_label', language)})</span>
            <span>20% ({t('free_fin_tax_standard_solo_label', language)})</span>
            <span>35% ({t('free_fin_tax_high_bracket_label', language)})</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-neutral-100 dark:border-neutral-700 text-xs">
            <div>
              <span className="text-neutral-400 block">{t('free_fin_gross_revenue_equiv', language)}</span>
              <span className="text-base font-bold font-mono text-neutral-900 dark:text-white tabular-nums">
                €{currencyTotals.totalEurEquiv.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block">{t('free_fin_expenses_total', language)}</span>
              <span className="text-base font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                -€{totalExpensesEurEquiv.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block">{t('free_fin_net_hourly_yield', language)}</span>
              <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                €{netEhr}{t('free_dash_per_hour', language)} <span className="text-xs font-normal text-neutral-400">({t('free_fin_gross_label', language)} €{grossEhr}{t('free_dash_per_hour', language)})</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Collection Pod Tray */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
        {/* Integrated Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#EDF1F3] dark:border-neutral-800/60">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
              <Receipt size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {t('free_fin_operational_overhead', language)}
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 text-neutral-600 dark:text-neutral-300">
                  {sortedExpenses.length} · ~€{totalExpensesEurEquiv.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 p-0.5 bg-white dark:bg-neutral-800 rounded-full border border-neutral-200/80 dark:border-neutral-700 ml-2 overflow-x-auto">
              {[
                { value: 'All', label: language === 'ar' ? 'الكل' : 'Tous' },
                { value: 'Software', label: t('free_fin_expense_software', language) },
                { value: 'Office', label: t('free_fin_expense_workspace', language) },
                { value: 'Hardware', label: t('free_fin_expense_hardware', language) },
                { value: 'Subcontractor', label: t('free_fin_expense_subcontractor', language) },
              ].map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all whitespace-nowrap cursor-pointer ${
                    categoryFilter === cat.value
                      ? 'bg-[#C4785A] text-white shadow-2xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Seek
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('free_fin_ph_vendor', language) || 'Search vendor...'}
              shutSize={38}
              openWidth={220}
            />

            <AtriumButton
              variant="secondary"
              size="sm"
              icon={<Download size={14} />}
              onClick={handleExportCSV}
              title="Export Expenses CSV"
            >
              <span className="hidden sm:inline">CSV</span>
            </AtriumButton>

            <AtriumButton
              variant="primary"
              size="sm"
              glow
              icon={<Plus size={14} />}
              onClick={() => setIsAddExpenseModalOpen(true)}
            >
              <span>{t('free_fin_btn_add_expense', language)}</span>
            </AtriumButton>
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
                <AtriumButton
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                >
                  {t('action_cancel', language)}
                </AtriumButton>
                <AtriumButton
                  variant="primary"
                  size="sm"
                  glow
                  type="submit"
                >
                  {t('free_fin_btn_save_expense', language)}
                </AtriumButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
