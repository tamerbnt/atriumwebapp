import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Banknote,
  CreditCard,
  Coins,
  FileText,
  Printer,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Sparkles,
  Building2,
  Trash2,
  Download,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { useTranslation } from '../../../utils/useTranslation';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { Seek } from '../../ui/Seek';
import { Modal } from '../../ui/Modal';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { FilterSelect } from '../../ui/FilterSelect';
import { AtriumButton } from '../../ui/AtriumButton';

interface PosExpense {
  id: string;
  reference: string;
  payee: string;
  category: 'Supplies' | 'Supplier' | 'Maintenance' | 'Transport' | 'StaffMeal' | 'Other';
  amount: number;
  paymentMethod: 'Cash' | 'Card' | 'BaridiMob';
  paidBy: string;
  notes?: string;
  createdAt: string;
}

const INITIAL_POS_EXPENSES: PosExpense[] = [
  {
    id: 'exp_pos_01',
    reference: 'DEC-001',
    payee: 'Boulangerie Centrale Didouche',
    category: 'Supplier',
    amount: 3500,
    paymentMethod: 'Cash',
    paidBy: 'Amine Bentouati',
    notes: 'Morning fresh croissant delivery invoice #412',
    createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
  },
  {
    id: 'exp_pos_02',
    reference: 'DEC-002',
    payee: 'Sarl Emballage Express Alger',
    category: 'Supplies',
    amount: 4200,
    paymentMethod: 'Cash',
    paidBy: 'Amine Bentouati',
    notes: 'Rolls of 80mm thermal paper (50 rolls) + shopping kraft bags',
    createdAt: new Date(Date.now() - 3600 * 1000 * 2.5).toISOString(),
  },
  {
    id: 'exp_pos_03',
    reference: 'DEC-003',
    payee: 'Kiosk Presse Didouche',
    category: 'Maintenance',
    amount: 600,
    paymentMethod: 'Cash',
    paidBy: 'Ryan Mehdi',
    notes: 'Cleaning detergent and counter sanitizing wipes',
    createdAt: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
  },
];

export const PosFinanceView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    sales,
    currentBranch,
    currentUser,
    resetPosMockData,
  } = useAtriumStore();

  const [expenses, setExpenses] = useState<PosExpense[]>(INITIAL_POS_EXPENSES);
  const [openingFloat, setOpeningFloat] = useState<number>(15000); // 15,000 DA cash drawer float
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [isZReportOpen, setIsZReportOpen] = useState(false);

  // Search & Filters for Expenses
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Expense modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expPayee, setExpPayee] = useState('');
  const [expCategory, setExpCategory] = useState<PosExpense['category']>('Supplies');
  const [expAmount, setExpAmount] = useState<number>(1500);
  const [expMethod, setExpMethod] = useState<'Cash' | 'Card' | 'BaridiMob'>('Cash');
  const [expNotes, setExpNotes] = useState('');

  // Selection & Pinning for expenses
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [pinnedExpenseIds, setPinnedExpenseIds] = useState<Set<string>>(new Set());

  // Filter sales for branch
  const branchSales = useMemo(() => {
    return sales.filter(
      (s) => s.facilityId === currentBranch.id || s.id.startsWith('sale_pos_')
    );
  }, [sales, currentBranch.id]);

  // Today's active sales
  const todaySales = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return branchSales.filter((s) => s.createdAt.startsWith(today) && s.status !== 'Refunded');
  }, [branchSales]);

  // Financial calculations
  const financeTotals = useMemo(() => {
    let cashSales = 0;
    let cardSales = 0;
    let baridiMobSales = 0;
    let totalGrossSales = 0;

    todaySales.forEach((s) => {
      totalGrossSales += s.totalAmount;
      if (s.paymentMethod === 'Cash') cashSales += s.totalAmount;
      else if (s.paymentMethod === 'Card') cardSales += s.totalAmount;
      else if (s.paymentMethod === 'BankTransfer') baridiMobSales += s.totalAmount;
      else if (s.paymentMethod === 'Split' && s.payments) {
        s.payments.forEach((p) => {
          if (p.method === 'Cash') cashSales += p.amount;
          else if (p.method === 'Card') cardSales += p.amount;
          else if (p.method === 'BankTransfer') baridiMobSales += p.amount;
        });
      }
    });

    const totalCashPayouts = expenses
      .filter((e) => e.paymentMethod === 'Cash')
      .reduce((acc, e) => acc + e.amount, 0);

    const totalAllExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const expectedCashInDrawer = openingFloat + cashSales - totalCashPayouts;
    const actualCounted = parseFloat(actualCashInput) || 0;
    const cashVariance = actualCashInput !== '' ? actualCounted - expectedCashInDrawer : 0;

    return {
      cashSales,
      cardSales,
      baridiMobSales,
      totalGrossSales,
      totalCashPayouts,
      totalAllExpenses,
      expectedCashInDrawer,
      actualCounted,
      cashVariance,
      hasCounted: actualCashInput !== '',
    };
  }, [todaySales, expenses, openingFloat, actualCashInput]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (categoryFilter !== 'All' && e.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.reference.toLowerCase().includes(q) ||
          e.payee.toLowerCase().includes(q) ||
          (e.notes && e.notes.toLowerCase().includes(q)) ||
          e.paidBy.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [expenses, categoryFilter, searchQuery]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expPayee.trim() || expAmount <= 0) return;

    const newExp: PosExpense = {
      id: `exp_pos_${Date.now()}`,
      reference: `DEC-${(expenses.length + 1).toString().padStart(3, '0')}`,
      payee: expPayee.trim(),
      category: expCategory,
      amount: expAmount,
      paymentMethod: expMethod,
      paidBy: currentUser?.fullName || 'Cashier',
      notes: expNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setExpenses([newExp, ...expenses]);
    setExpPayee('');
    setExpAmount(1500);
    setExpNotes('');
    setIsExpenseModalOpen(false);

    showToast({
      type: 'info',
      title: language === 'ar' ? 'تم تسجيل خروج نقدي من الصندوق' : 'Sortie de Caisse Enregistrée',
      message: `${newExp.payee} · ${formatMoney(newExp.amount)} (${newExp.category})`,
      category: 'pos_inventory',
    });
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const handleExportExpensesCSV = () => {
    const headers = ['Ref #', 'Date & Time', 'Payee / Supplier', 'Category', 'Payment Method', 'Handled By', 'Amount (DA)', 'Notes'];
    const rows = filteredExpenses.map((e) => [
      `"${e.reference}"`,
      `"${new Date(e.createdAt).toLocaleString()}"`,
      `"${e.payee}"`,
      `"${e.category}"`,
      `"${e.paymentMethod}"`,
      `"${e.paidBy}"`,
      e.amount,
      `"${e.notes || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Store_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Columns for Expenses UniversalDataCollection
  const expenseColumns: ColumnDefinition<PosExpense>[] = useMemo(() => [
    {
      key: 'ref',
      header: language === 'ar' ? 'المرجع' : 'Réf',
      width: '1.2*',
      minWidth: '100px',
      sortable: true,
      renderCell: (e) => (
        <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
          {e.reference}
        </span>
      ),
    },
    {
      key: 'payee',
      header: language === 'ar' ? 'المستفيد / المورد' : 'Bénéficiaire / Motif',
      width: '2.5*',
      minWidth: '180px',
      sortable: true,
      renderCell: (e) => (
        <div>
          <div className="font-bold text-xs text-neutral-900 dark:text-white truncate">
            {e.payee}
          </div>
          {e.notes && (
            <div className="text-[10px] text-neutral-400 truncate">
              {e.notes}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: language === 'ar' ? 'التصنيف' : 'Catégorie',
      width: '1.4*',
      minWidth: '120px',
      sortable: true,
      renderCell: (e) => (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
          {e.category}
        </span>
      ),
    },
    {
      key: 'method',
      header: language === 'ar' ? 'الوسيلة' : 'Mode',
      width: '1.2*',
      minWidth: '100px',
      renderCell: (e) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-300">
          {e.paymentMethod === 'Cash' ? 'Espèces' : e.paymentMethod}
        </span>
      ),
    },
    {
      key: 'amount',
      header: language === 'ar' ? 'المبلغ' : 'Montant',
      width: '1.5*',
      minWidth: '120px',
      sortable: true,
      renderCell: (e) => (
        <span className="font-mono font-black text-sm text-red-600 dark:text-red-400 tabular-nums">
          -{formatMoney(e.amount)}
        </span>
      ),
    },
    {
      key: 'paidBy',
      header: language === 'ar' ? 'المسؤول' : 'Caissier',
      width: '1.5*',
      minWidth: '120px',
      renderCell: (e) => (
        <span className="text-xs text-neutral-500 truncate block">
          {e.paidBy}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '1*',
      minWidth: '60px',
      renderCell: (e) => (
        <button
          type="button"
          onClick={(ev) => {
            ev.stopPropagation();
            handleDeleteExpense(e.id);
          }}
          className="text-neutral-400 hover:text-red-500 cursor-pointer p-1"
          title="Delete entry"
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ], [language]);

  return (
    <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 p-6 lg:p-8 space-y-6 shadow-xs pb-16" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Wallet className="text-[#C4785A]" size={26} />
              <span>
                {language === 'ar' ? 'إدارة الصندوق والمالية' : language === 'fr' ? 'Gestion Caisse & Réconciliation Financière' : 'Cash Drawer & Store Finance'}
              </span>
            </h1>
            <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              {currentBranch.name}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {language === 'ar'
              ? 'مراقبة الرصيد الافتتاحي، التسوية المادية للمدفوعات، احتساب الفارق (Écart)، وطباعة تقرير Z للإغلاق'
              : 'Fond de caisse initial, pointage physique des espèces, contrôle des écarts et édition du rapport Z de fin de journée.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={resetPosMockData}
            className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 text-xs font-bold text-neutral-700 dark:text-neutral-200 flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <Sparkles size={14} className="text-[#C4785A]" />
            <span>{language === 'ar' ? 'شحن العينة' : 'Démo Recharge'}</span>
          </button>

          <AtriumButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsZReportOpen(true)}
            icon={<Printer size={14} className="text-[#C4785A]" />}
          >
            {language === 'ar' ? 'إصدار تقرير Z اليومي' : 'Éditer Rapport Z'}
          </AtriumButton>

          <AtriumButton
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsExpenseModalOpen(true)}
            icon={<Plus size={15} />}
          >
            {language === 'ar' ? 'تسجيل مصاريف الصندوق' : 'Sortie de Caisse'}
          </AtriumButton>
        </div>
      </div>

      {/* TOP METRICS POD TRAY */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E9EEF0] dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Banknote size={18} className="text-[#C4785A]" />
            <h2 className="text-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              {language === 'ar' ? 'لوحة مؤشرات الخزينة والتسوية النقدية' : 'Indicateurs de Caisse & Contrôle des Écarts'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-500 font-bold">
              {language === 'ar' ? 'الرصيد الافتتاحي :' : 'Fond de Caisse Initial :'}
            </span>
            <input
              type="number"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
              className="w-24 h-7 px-2 text-xs font-mono font-bold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
            />
            <span className="text-[11px] text-neutral-400 font-mono">DA</span>
          </div>
        </div>

        {/* 4 Cards Grid including Dark Espresso Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Ventes Brutes */}
          <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {language === 'ar' ? 'إجمالي المبيعات' : 'Ventes Brutes Jour'}
                </span>
                <Receipt size={16} className="text-[#C4785A]" />
              </div>
              <div className="text-2xl font-black font-mono text-neutral-900 dark:text-white tracking-tight tabular-nums">
                {formatMoney(financeTotals.totalGrossSales)}
              </div>
            </div>
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700/50 mt-3 flex items-center justify-between text-[11px] text-neutral-500">
              <span>{todaySales.length} {language === 'ar' ? 'عملية بيع' : 'tickets'}</span>
              <span className="font-mono font-bold text-emerald-600">Espèces: {formatMoney(financeTotals.cashSales)}</span>
            </div>
          </div>

          {/* Card 2: Sorties de Caisse */}
          <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {language === 'ar' ? 'سحوبات ومصاريف' : 'Sorties de Caisse'}
                </span>
                <TrendingUp size={16} className="text-red-500 rotate-180" />
              </div>
              <div className="text-2xl font-black font-mono text-red-600 dark:text-red-400 tracking-tight tabular-nums">
                -{formatMoney(financeTotals.totalCashPayouts)}
              </div>
            </div>
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700/50 mt-3 flex items-center justify-between text-[11px] text-neutral-500">
              <span>{expenses.length} {language === 'ar' ? 'دفعات نقدية' : 'dépenses'}</span>
              <span className="text-neutral-400 truncate">Fournitures & Livreurs</span>
            </div>
          </div>

          {/* Card 3: Solde Théorique */}
          <div className="bg-white dark:bg-neutral-800 rounded-[18px] p-4 lg:p-5 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {language === 'ar' ? 'الرصيد النظري المتوقع' : 'Solde Théorique Attendu'}
                </span>
                <Coins size={16} className="text-[#C4785A]" />
              </div>
              <div className="text-2xl font-black font-mono text-[#C4785A] tracking-tight tabular-nums">
                {formatMoney(financeTotals.expectedCashInDrawer)}
              </div>
            </div>
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700/50 mt-3 text-[11px] text-neutral-500">
              <span>Fond ({formatMoney(openingFloat)}) + Cash - Sorties</span>
            </div>
          </div>

          {/* Card 4: DARK ESPRESSO ANCHOR CARD (#1F1D1B) */}
          <div className="bg-[#1F1D1B] rounded-[18px] p-4 lg:p-5 border border-neutral-800 shadow-sm text-white flex flex-col justify-between relative overflow-hidden group">
            {/* Glowing Sparkline Graphic */}
            <div className="absolute -right-4 -bottom-6 opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
              <svg width="140" height="90" viewBox="0 0 140 90" fill="none">
                <path
                  d="M10 70 L35 55 L60 62 L85 30 L110 38 L135 15"
                  stroke="#FB923C"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="135" cy="15" r="4" fill="#FB923C" />
              </svg>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  {language === 'ar' ? 'مراقبة الفارق (Écart)' : 'Pointage Caisse & Écart'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  !financeTotals.hasCounted
                    ? 'bg-[#3D2817] text-[#FB923C] border-[#FB923C]/30'
                    : financeTotals.cashVariance === 0
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/40'
                    : financeTotals.cashVariance > 0
                    ? 'bg-blue-950/80 text-blue-300 border-blue-700/40'
                    : 'bg-red-950/80 text-red-300 border-red-700/40'
                }`}>
                  {!financeTotals.hasCounted
                    ? 'Saisie requise'
                    : financeTotals.cashVariance === 0
                    ? 'Écart : 0 DA'
                    : financeTotals.cashVariance > 0
                    ? `+${formatMoney(financeTotals.cashVariance)}`
                    : formatMoney(financeTotals.cashVariance)}
                </span>
              </div>

              {/* Physical count input */}
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  placeholder="Compté en DA"
                  value={actualCashInput}
                  onChange={(e) => setActualCashInput(e.target.value)}
                  className="w-full h-8 px-2.5 text-xs font-mono font-bold rounded-lg bg-neutral-900 border border-neutral-700 text-white placeholder:text-neutral-500 focus:outline-hidden focus:border-[#FB923C]"
                />
                <span className="text-[11px] font-mono text-neutral-400">DA</span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 mt-2 text-[11px] text-neutral-400 flex items-center justify-between">
              <span>{language === 'ar' ? 'الحالة :' : 'Résultat :'}</span>
              <span className="font-bold text-neutral-200">
                {!financeTotals.hasCounted
                  ? 'Entrez le montant compté'
                  : financeTotals.cashVariance === 0
                  ? 'Caisse parfaite (Juste)'
                  : financeTotals.cashVariance > 0
                  ? 'Excédent de caisse'
                  : 'Déficit de caisse'}
              </span>
            </div>
          </div>
        </div>

        {/* Linear Drawer Equation Bar */}
        <div className="bg-white dark:bg-neutral-900 rounded-[16px] p-3 border border-[#E9EEF0] dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-neutral-400 uppercase font-bold text-[10px]">Fond</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200">{formatMoney(openingFloat)}</span>
          </div>
          <span className="text-neutral-300 dark:text-neutral-600 font-bold">+</span>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-emerald-500 uppercase font-bold text-[10px]">Ventes Espèces</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatMoney(financeTotals.cashSales)}</span>
          </div>
          <span className="text-neutral-300 dark:text-neutral-600 font-bold">-</span>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-red-400 uppercase font-bold text-[10px]">Sorties</span>
            <span className="font-bold text-red-500">-{formatMoney(financeTotals.totalCashPayouts)}</span>
          </div>
          <span className="text-neutral-300 dark:text-neutral-600 font-bold">=</span>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-[#C4785A] uppercase font-bold text-[10px]">Théorique</span>
            <span className="font-bold text-[#C4785A]">{formatMoney(financeTotals.expectedCashInDrawer)}</span>
          </div>
        </div>
      </div>

      {/* TENDER BREAKDOWN POD TRAY (SurfaceBgElevated: #F8F9FA, CornerRadius 24px) */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#EDF1F3] dark:border-neutral-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <CreditCard size={16} />
            </div>
            <div>
              <span className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                {language === 'ar' ? 'توزيع طرق الدفع والتحصيل' : 'Ventilation par Mode de Règlement'}
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">
                {language === 'ar' ? 'المطابقة الحسابية بين السيولة النقدية والتحصيلات الإلكترونية' : 'Répartition des encaissements comptoir et flux monétiques'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote size={17} className="text-emerald-500" />
                <h3 className="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300">
                  {language === 'ar' ? 'الدفع نقداً' : 'Règlement Espèces'}
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-neutral-400">
                {financeTotals.totalGrossSales > 0 ? `${Math.round((financeTotals.cashSales / financeTotals.totalGrossSales) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-xl font-black font-mono text-neutral-900 dark:text-white tabular-nums">
              {formatMoney(financeTotals.cashSales)}
            </div>
            <div className="text-[11px] text-neutral-400">
              {language === 'ar' ? 'مدفوعات نقدية مسددة بالدينار الجزائري' : 'Total liquide perçu au comptoir'}
            </div>
          </div>

          <div className="p-4 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={17} className="text-blue-500" />
                <h3 className="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300">
                  CIB & Carte Edahabia
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-neutral-400">
                {financeTotals.totalGrossSales > 0 ? `${Math.round((financeTotals.cardSales / financeTotals.totalGrossSales) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-xl font-black font-mono text-neutral-900 dark:text-white tabular-nums">
              {formatMoney(financeTotals.cardSales)}
            </div>
            <div className="text-[11px] text-neutral-400">
              {language === 'ar' ? 'معاملات إلكترونية عبر أجهزة TPE SATIM' : 'Transactions TPE monétique bancaire'}
            </div>
          </div>

          <div className="p-4 rounded-[18px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins size={17} className="text-[#C4785A]" />
                <h3 className="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300">
                  BaridiMob & Virements
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-neutral-400">
                {financeTotals.totalGrossSales > 0 ? `${Math.round((financeTotals.baridiMobSales / financeTotals.totalGrossSales) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="text-xl font-black font-mono text-neutral-900 dark:text-white tabular-nums">
              {formatMoney(financeTotals.baridiMobSales)}
            </div>
            <div className="text-[11px] text-neutral-400">
              {language === 'ar' ? 'تحويلات بريد الجزائر الفورية بريدي موب' : 'Virements RIP / CCP Algérie Poste'}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM COLLECTION POD TRAY */}
      <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[24px] p-5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs space-y-4">
        {/* Controls Bar: Title + Seek Search + Category Filter + Actions */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left Title / Icon / Count Anchor */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FCEEE8] dark:bg-neutral-800 flex items-center justify-center text-[#C4785A]">
              <TrendingDown size={18} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                {language === 'ar' ? 'سجل مصاريف وسحوبات الصندوق' : 'Journal des Sorties de Caisse'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#C4785A]/10 text-[#C4785A] font-semibold font-mono">
                {filteredPayouts.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-56">
              <Seek
                placeholder={language === 'ar' ? 'بحث في المصاريف...' : 'Rechercher une dépense...'}
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>

            <FilterSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'All', label: language === 'ar' ? 'كل المصاريف' : 'Toutes Catégories' },
                { value: 'Supplies', label: 'Fournitures' },
                { value: 'Supplier', label: 'Fournisseurs' },
                { value: 'Maintenance', label: 'Maintenance' },
                { value: 'Transport', label: 'Transport' },
                { value: 'StaffMeal', label: 'Collation' },
                { value: 'Other', label: 'Autre' },
              ]}
              ariaLabel="Filtrer par catégorie de dépense"
            />

            <button
              type="button"
              onClick={handleExportExpensesCSV}
              className="h-9 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 hover:bg-neutral-50 cursor-pointer shadow-2xs"
            >
              <Download size={13} />
              <span>{language === 'ar' ? 'تصدير CSV' : 'Export CSV'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(true)}
              className="h-9 px-3.5 rounded-xl bg-[#C4785A] text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              <span>{language === 'ar' ? 'إضافة سحب' : 'Nouvelle Dépense'}</span>
            </button>
          </div>
        </div>

        {/* Inset Container hosting UniversalDataCollection */}
        <div className="bg-white dark:bg-neutral-800 rounded-[18px] border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs overflow-hidden">
          <UniversalDataCollection<PosExpense>
            items={filteredExpenses}
            keyExtractor={(e) => e.id}
            defaultViewMode="list"
            columns={expenseColumns}
            renderCard={(e) => (
              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-mono font-bold text-xs text-neutral-900 dark:text-white">
                      {e.reference}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                      {e.category}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-neutral-900 dark:text-white">
                    {e.payee}
                  </div>
                  {e.notes && (
                    <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                      {e.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="font-mono font-black text-sm text-red-600 dark:text-red-400 tabular-nums">
                    -{formatMoney(e.amount)}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {new Date(e.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
            selectedIds={selectedExpenseIds}
            onSelectionChange={setSelectedExpenseIds}
            isPinned={(e) => pinnedExpenseIds.has(e.id)}
            onTogglePin={(e) => {
              setPinnedExpenseIds((prev) => {
                const next = new Set(prev);
                if (next.has(e.id)) next.delete(e.id);
                else next.add(e.id);
                return next;
              });
            }}
            emptyTitle={language === 'ar' ? 'لا توجد مصاريف مطابقة' : 'Aucune dépense de caisse trouvée'}
            emptyDescription={language === 'ar' ? 'انقر على إضافة سحب لتسجيل مصاريف جديدة' : 'Enregistrez vos achats de fournitures ou paiements fournisseurs.'}
            primaryActionLabel={language === 'ar' ? 'إضافة سحب' : 'Nouvelle Dépense'}
            onAddFirstItem={() => setIsExpenseModalOpen(true)}
          />
        </div>
      </div>

      {/* MODAL: New Store Expense Payout */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={language === 'ar' ? 'تسجيل سحب نقدي من الصندوق' : 'Enregistrer une Sortie de Caisse'}
        subtitle={`Session ${currentBranch.name}`}
      >
        <form onSubmit={handleAddExpense} className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <LabelInput
            field="Payee"
            label={language === 'ar' ? 'المستفيد / الجهة الموردة' : 'Bénéficiaire / Fournisseur'}
            required
            value={expPayee}
            onChange={setExpPayee}
            placeholder="Ex: Boulangerie, Fournisseur café, Quincaillerie..."
            width="100%"
            height={44}
            corner={12}
          />

          <div className="grid grid-cols-2 gap-3">
            <LabelInput
              field="Amount"
              label={language === 'ar' ? 'المبلغ (د.ج)' : 'Montant (DZD)'}
              type="number"
              required
              value={expAmount ? String(expAmount) : ''}
              onChange={(v) => setExpAmount(parseFloat(v) || 0)}
              width="100%"
              height={44}
              corner={12}
            />

            <LabelSelect
              field="Category"
              label={language === 'ar' ? 'التصنيف' : 'Catégorie de charge'}
              value={expCategory}
              onChange={(val) => setExpCategory(typeof val === 'string' ? (val as any) : (val.target?.value || val))}
              options={[
                { value: 'Supplies', label: 'Fournitures & Emballages' },
                { value: 'Supplier', label: 'Règlement Fournisseur' },
                { value: 'Maintenance', label: 'Entretien & Réparation' },
                { value: 'Transport', label: 'Livraison & Course' },
                { value: 'StaffMeal', label: 'Collation / Repas équipe' },
                { value: 'Other', label: 'Autre dépense' },
              ]}
              height={44}
              corner={12}
            />
          </div>

          <LabelSelect
            field="Method"
            label={language === 'ar' ? 'طريقة السحب' : 'Mode de paiement'}
            value={expMethod}
            onChange={(val) => setExpMethod(typeof val === 'string' ? (val as any) : (val.target?.value || val))}
            options={[
              { value: 'Cash', label: 'Espèces (Du tiroir-caisse)' },
              { value: 'Card', label: 'Carte d’entreprise' },
              { value: 'BaridiMob', label: 'Virement BaridiMob' },
            ]}
            height={44}
            corner={12}
          />

          <LabelInput
            field="Notes"
            label={language === 'ar' ? 'ملاحظات أو رقم الفاتورة' : 'Notes / Réf reçu'}
            value={expNotes}
            onChange={setExpNotes}
            placeholder="Facture #412..."
            width="100%"
            height={44}
            corner={12}
          />

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="h-10 px-4 text-xs font-semibold text-neutral-500 rounded-full hover:bg-neutral-100 cursor-pointer"
            >
              {t('action_cancel')}
            </button>
            <button
              type="submit"
              className="h-10 px-5 text-xs font-bold text-white bg-[#C4785A] rounded-full hover:opacity-90 cursor-pointer shadow-xs"
            >
              {language === 'ar' ? 'تأكيد السحب' : 'Valider la Dépense'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Z-Report Closeout Preview */}
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
                <div className="text-[9px] text-neutral-400">CAISSIER : {currentUser?.fullName || 'Amine Bentouati'}</div>
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-neutral-400 text-[11px]">
                <div className="flex justify-between">
                  <span>FOND DE CAISSE INITIAL :</span>
                  <span className="font-bold">{formatMoney(openingFloat)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VENTES BRUTES :</span>
                  <span className="font-bold">{formatMoney(financeTotals.totalGrossSales)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>SORTIES DE CAISSE :</span>
                  <span>-{formatMoney(financeTotals.totalCashPayouts)}</span>
                </div>
                <div className="flex justify-between pt-1 font-black text-sm">
                  <span>SOLDE THÉORIQUE ATTENDU :</span>
                  <span>{formatMoney(financeTotals.expectedCashInDrawer)}</span>
                </div>
              </div>

              <div className="space-y-1 py-1 border-b border-dashed border-neutral-400 text-[11px]">
                <div className="font-bold text-[10px] text-neutral-500 uppercase">VENTILATION PAR MODE DE PAIEMENT :</div>
                <div className="flex justify-between">
                  <span>ESPÈCES :</span>
                  <span className="font-bold">{formatMoney(financeTotals.cashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CARTE CIB / EDAHABIA :</span>
                  <span className="font-bold">{formatMoney(financeTotals.cardSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>BARIDIMOB / VIREMENT :</span>
                  <span className="font-bold">{formatMoney(financeTotals.baridiMobSales)}</span>
                </div>
              </div>

              {financeTotals.hasCounted && (
                <div className="space-y-1 py-1 border-b border-dashed border-neutral-400 text-[11px]">
                  <div className="flex justify-between font-bold">
                    <span>ESPÈCES PHYSICOMPTÉES :</span>
                    <span>{formatMoney(financeTotals.actualCounted)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ÉCART DE CAISSE :</span>
                    <span className={financeTotals.cashVariance >= 0 ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                      {financeTotals.cashVariance >= 0 ? `+${formatMoney(financeTotals.cashVariance)}` : formatMoney(financeTotals.cashVariance)}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 text-[10px] text-center text-neutral-600">
                SIGNATURE ET VISA DU RESPONSABLE DU POINT DE VENTE
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-10 px-4 rounded-full bg-[#C4785A] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90"
              >
                <Printer size={14} />
                <span>Imprimer Rapport Z 80mm</span>
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
