import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Wallet,
  Plus,
  ShieldCheck,
  X,
  Trash2,
  Pin,
  CheckCircle2,
  Eye,
  BadgeCheck,
  AlertTriangle,
  Upload,
  FileCheck2,
  SlidersHorizontal,
} from 'lucide-react';
import {
  useAtriumSelector,
  useAtriumActions,
  useDashboardShellState,
  shallowEqualObjects,
  selectCurrentFreelanceInvoicesFromState,
  selectCurrentFreelanceExpensesFromState,
  selectCurrentFreelanceAeConfigsFromState,
  selectCurrentTimeLogsFromState,
  selectCurrentBranchFromState,
  selectCurrentBusinessConfigFromState,
  showToast,
} from '../../../services/store';
import { runUndoBatch } from '../../../services/undoEngine';
import { formatCurrencyAmount } from '../../../utils/rules';
import { evaluateAutoEntrepreneurTurnover } from '../../../utils/freelanceDepth';
import { validateFileForBucket } from '../../../lib/supabase';
import { FreelanceExpense, ExpenseCategory, CurrencyCode } from '../../../types/index';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
import { LiveSwitch } from '../../ui/live/LiveSwitch';
import { Button } from '@/atrium/core';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
import { useTranslation } from '../../../utils/useTranslation';
import { useSkeletonLoading } from '../../../hooks/useSkeletonLoading';
import { SkeletonCollectionScreen } from '../../ui/skeleton/StructuralSkeletons';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ActiveFilterChip,
  KineticFilterModal,
  KineticFilterSection,
  KineticSlideOverInspector,
  InspectorSection,
  InspectorQuickActions,
  InspectorCard,
  InspectorKeyValue,
  InspectorBigStat,
  InspectorWideButton,
  KineticRowMeta,
  KineticRowFanAction,
  KineticDetailAction,
  KineticModalShell,
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

export const FreelanceFinanceView: React.FC = () => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const {
    freelanceInvoices,
    freelanceExpenses,
    freelanceAeConfigs,
    timeLogs,
    branches,
    currentBranch,
    currentBusinessConfig,
  } = useAtriumSelector(
    (s) => ({
      freelanceInvoices: selectCurrentFreelanceInvoicesFromState(s),
      freelanceExpenses: selectCurrentFreelanceExpensesFromState(s),
      freelanceAeConfigs: selectCurrentFreelanceAeConfigsFromState(s),
      timeLogs: selectCurrentTimeLogsFromState(s),
      branches: s.branches,
      currentBranch: selectCurrentBranchFromState(s),
      currentBusinessConfig: selectCurrentBusinessConfigFromState(s),
    }),
    shallowEqualObjects
  );
  const { isSyncing, networkMode, isSyncTimeout, lastSyncedAt, retryCloudSync } =
    useDashboardShellState();
  const {
    addFreelanceExpense,
    deleteFreelanceExpense,
    attachExpenseReceipt,
    upsertFreelanceAeConfig,
    markFreelanceAeConfigVerified,
  } = useAtriumActions();

  const defaultTaxReserve = currentBusinessConfig.categorySettings?.taxReservePercent ?? 20;
  const defaultCurrency = (currentBusinessConfig.currency as CurrencyCode) || 'EUR';
  const configuredHourlyRate = currentBusinessConfig.categorySettings?.defaultHourlyRate ?? 85;

  const aeSummary = useMemo(
    () =>
      evaluateAutoEntrepreneurTurnover({
        invoices: freelanceInvoices,
        expenses: freelanceExpenses,
        configs: freelanceAeConfigs,
      }),
    [freelanceInvoices, freelanceExpenses, freelanceAeConfigs]
  );

  const [taxRate, setTaxRate] = useState(defaultTaxReserve);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isAeModalOpen, setIsAeModalOpen] = useState(false);

  const [aeEffectiveFrom, setAeEffectiveFrom] = useState(
    aeSummary.activeConfig.effectiveFrom || `${new Date().getFullYear()}-01-01`
  );
  const [aeCeilingDzd, setAeCeilingDzd] = useState(aeSummary.annualCeilingDzd);
  const [aeContribPct, setAeContribPct] = useState(aeSummary.activeConfig.contributionRatePct);
  const [aeTaxPct, setAeTaxPct] = useState(aeSummary.activeConfig.taxRatePct);
  const [aeSpecialty, setAeSpecialty] = useState(aeSummary.activeConfig.tradeSpecialty || '');
  const [aeVerifyOnSave, setAeVerifyOnSave] = useState(false);

  const [pendingReceiptFile, setPendingReceiptFile] = useState<File | null>(null);
  const [receiptValidationError, setReceiptValidationError] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [deductibleFilter, setDeductibleFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedExpense, setSelectedExpense] = useState<FreelanceExpense | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>('overview');

  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedExpenseIds, setPinnedExpenseIds] = useState<Set<string>>(() => new Set<string>());
  const [expenseSortBy, setExpenseSortBy] = useState<string>('amount');
  const [expenseSortDir, setExpenseSortDir] = useState<'asc' | 'desc'>('desc');

  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Software');
  const [amount, setAmount] = useState(25);
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [isTaxDeductible, setIsTaxDeductible] = useState(true);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    freelanceExpenses.forEach((exp) => {
      const bName = resolveRecordBranch(exp, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [freelanceExpenses, branchesById, currentBranch, language]);

  const currencyTotals = useMemo(() => {
    const paid = freelanceInvoices.filter((i) => i.status === 'Paid');
    const eur = paid.filter((i) => i.currency === 'EUR').reduce((s, i) => s + i.totalAmount, 0);
    const usd = paid.filter((i) => i.currency === 'USD').reduce((s, i) => s + i.totalAmount, 0);
    const dzd = paid.filter((i) => i.currency === 'DZD').reduce((s, i) => s + i.totalAmount, 0);
    return {
      eur,
      usd,
      dzd,
      totalEurEquiv: Math.round(eur + usd / 1.08 + dzd / 230),
    };
  }, [freelanceInvoices]);

  const totalExpensesEurEquiv = useMemo(() => {
    return Math.round(
      freelanceExpenses.reduce((sum, exp) => {
        if (exp.currency === 'EUR') return sum + exp.amount;
        if (exp.currency === 'USD') return sum + exp.amount / 1.08;
        return sum + exp.amount / 230;
      }, 0)
    );
  }, [freelanceExpenses]);

  const grossProfitEur = Math.max(0, currencyTotals.totalEurEquiv - totalExpensesEurEquiv);
  const taxReserveAmount = Math.round(grossProfitEur * (taxRate / 100));
  const netTakeHomeEur = grossProfitEur - taxReserveAmount;
  const totalBillableHours = Number(
    (
      timeLogs.filter((l) => l.isBillable).reduce((sum, l) => sum + l.durationSeconds, 0) / 3600
    ).toFixed(1)
  );
  const grossEhr =
    totalBillableHours > 0 ? Math.round(currencyTotals.totalEurEquiv / totalBillableHours) : configuredHourlyRate;
  const netEhr =
    totalBillableHours > 0 ? Math.round(netTakeHomeEur / totalBillableHours) : Math.round(configuredHourlyRate * (1 - taxRate / 100));

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return freelanceExpenses.filter((exp) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(exp, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (categoryFilter !== 'All' && exp.category !== categoryFilter) return false;
      if (deductibleFilter === 'deductible' && !exp.isTaxDeductible) return false;
      if (deductibleFilter === 'non_deductible' && exp.isTaxDeductible) return false;
      if (q) {
        const matchesVendor = exp.vendor.toLowerCase().includes(q);
        const matchesDesc = exp.description.toLowerCase().includes(q);
        const matchesCategory = exp.category.toLowerCase().includes(q);
        if (!matchesVendor && !matchesDesc && !matchesCategory) return false;
      }
      return true;
    });
  }, [
    freelanceExpenses,
    branchFilter,
    categoryFilter,
    deductibleFilter,
    searchQuery,
    branchesById,
    currentBranch,
    language,
  ]);

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
      if (expenseSortBy === 'branch') {
        const cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
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
  }, [
    filteredExpenses,
    pinnedExpenseIds,
    expenseSortBy,
    expenseSortDir,
    branchesById,
    currentBranch,
    language,
  ]);

  const activeExpense = useMemo(() => {
    if (!selectedExpense) return null;
    return freelanceExpenses.find((e) => e.id === selectedExpense.id) || selectedExpense;
  }, [selectedExpense, freelanceExpenses]);

  const handleBatchDeleteExpenses = () => {
    const targetIds = Array.from(selectedExpenseIds);
    if (targetIds.length === 0) return;
    runUndoBatch(
      {
        vertical: 'freelance_solo',
        operationType: 'bulk',
        affectedCount: targetIds.length,
        summary: isAr
          ? `حذف مصاريف (${targetIds.length})`
          : isFr
          ? `Suppression dépenses (${targetIds.length})`
          : `Delete expenses (${targetIds.length})`,
      },
      () => {
        targetIds.forEach((id) => {
          deleteFreelanceExpense(id);
          if (selectedExpense?.id === id) setSelectedExpense(null);
        });
      }
    );
    setSelectedExpenseIds(new Set());
  };

  const handleExportCSV = useCallback(() => {
    if (sortedExpenses.length === 0) return;
    const headers = [
      isAr ? 'المورد / الخدمة' : isFr ? 'Fournisseur / Service' : 'Vendor',
      isAr ? 'الفئة' : isFr ? 'Catégorie' : 'Category',
      isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
      isAr ? 'الوصف' : 'Description',
      isAr ? 'المبلغ' : isFr ? 'Montant' : 'Amount',
      isAr ? 'العملة' : isFr ? 'Devise' : 'Currency',
      isAr ? 'معفى ضريبياً' : isFr ? 'Déductible' : 'Tax Deductible',
      isAr ? 'التاريخ' : 'Date',
    ];
    const rows = sortedExpenses.map((exp) => [
      exp.vendor,
      exp.category,
      resolveRecordBranch(exp, branchesById, currentBranch, language).name,
      exp.description,
      exp.amount,
      exp.currency,
      exp.isTaxDeductible ? 'Yes' : 'No',
      exp.date || '',
    ]);
    downloadCsvSafe(
      `atrium-expenses-${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
  }, [sortedExpenses, branchesById, currentBranch, language, isAr, isFr]);

  const handleSelectModalReceipt = (file?: File | null) => {
    if (!file) {
      setPendingReceiptFile(null);
      setReceiptValidationError(null);
      return;
    }
    const check = validateFileForBucket('expense-receipts', file);
    if (!check.valid) {
      setReceiptValidationError(check.error || 'Invalid receipt file');
      setPendingReceiptFile(null);
      return;
    }
    setReceiptValidationError(null);
    setPendingReceiptFile(file);
  };

  const handleAttachInspectorReceipt = async (expenseId: string, file?: File | null) => {
    if (!file) return;
    const check = validateFileForBucket('expense-receipts', file);
    if (!check.valid) {
      showToast({
        type: 'error',
        title: t('free_depth_exp_receipt', language),
        message: check.error || 'Invalid file',
      });
      return;
    }
    setIsUploadingReceipt(true);
    try {
      await attachExpenseReceipt(expenseId, file);
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleSaveAeConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = upsertFreelanceAeConfig({
      effectiveFrom: aeEffectiveFrom,
      annualTurnoverCeilingDzd: Number(aeCeilingDzd) || 5000000,
      contributionRatePct: Number(aeContribPct),
      taxRatePct: Number(aeTaxPct),
      tradeSpecialty: aeSpecialty.trim() || undefined,
      verificationStatus: aeVerifyOnSave ? 'verified' : 'unverified',
    });
    if (aeVerifyOnSave) {
      markFreelanceAeConfigVerified(saved.id);
    }
    setIsAeModalOpen(false);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor.trim() || !description.trim()) return;
    const created = addFreelanceExpense({
      vendor,
      description,
      category,
      amount: Number(amount),
      currency,
      date: new Date().toISOString().split('T')[0],
      isTaxDeductible,
    });
    if (created?.id && pendingReceiptFile) {
      await attachExpenseReceipt(created.id, pendingReceiptFile);
    }
    setVendor('');
    setDescription('');
    setPendingReceiptFile(null);
    setReceiptValidationError(null);
    setIsAddExpenseModalOpen(false);
  };

  const getExpenseRowMeta = useCallback(
    (exp: FreelanceExpense): KineticRowMeta => {
      const branchInfo = resolveRecordBranch(exp, branchesById, currentBranch, language);
      const taxLabel = exp.isTaxDeductible
        ? isAr
          ? 'معفى ضريبياً'
          : isFr
          ? 'Déductible'
          : 'Deductible'
        : isAr
        ? 'قياسي'
        : isFr
        ? 'Standard'
        : 'Standard';
      return {
        avatarText: exp.vendor.slice(0, 2).toUpperCase(),
        subline: exp.description,
        categoryLabel: exp.category,
        statusVariant: exp.isTaxDeductible ? 'active' : 'warning',
        statusLabel: taxLabel,
        metricPrimary: formatCurrencyAmount(exp.amount, exp.currency),
        metricSecondary: exp.date || '2026-02-15',
        detailCol1: {
          heading: isAr ? 'المورد والفئة' : isFr ? 'Fournisseur & Catégorie' : 'Vendor & Category',
          primaryText: exp.vendor,
          secondaryText: exp.category,
        },
        detailCol2: {
          heading: isAr ? 'المبلغ والضريبة' : isFr ? 'Montant & Fiscalité' : 'Amount & Tax',
          primaryText: formatCurrencyAmount(exp.amount, exp.currency),
          secondaryText: taxLabel,
        },
        detailCol3: {
          heading: isAr ? 'الفرع والتاريخ' : isFr ? 'Branche & Date' : 'Branch & Date',
          primaryText: branchInfo.name,
          secondaryText: exp.date || '2026-02-15',
        },
      };
    },
    [branchesById, currentBranch, language, isAr, isFr]
  );

  const getExpenseFanActions = useCallback(
    (exp: FreelanceExpense): KineticRowFanAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'تفاصيل' : isFr ? 'Détails' : 'Details',
        icon: <Eye className="w-[15px] h-[15px]" />,
        onClick: (e) => {
          setDrawerOpenerEl(e.currentTarget);
          setSelectedExpense(exp);
          setInspectorTab('overview');
        },
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : isFr ? 'Supprimer' : 'Delete',
        icon: <Trash2 className="w-[15px] h-[15px]" />,
        isDanger: true,
        onClick: () => {
          deleteFreelanceExpense(exp.id);
          if (selectedExpense?.id === exp.id) setSelectedExpense(null);
        },
      },
    ],
    [isAr, isFr, deleteFreelanceExpense, selectedExpense]
  );

  const getExpenseDetailActions = useCallback(
    (exp: FreelanceExpense): KineticDetailAction[] => [
      {
        id: 'inspect',
        label: isAr ? 'عرض' : isFr ? 'Inspecter' : 'Inspect',
        icon: <Eye className="w-3.5 h-3.5" />,
        onClick: () => {
          setSelectedExpense(exp);
          setInspectorTab('overview');
        },
      },
      {
        id: 'del',
        label: isAr ? 'حذف' : isFr ? 'Supprimer' : 'Delete',
        icon: <Trash2 className="w-3.5 h-3.5 text-[#c0283d]" />,
        onClick: () => {
          deleteFreelanceExpense(exp.id);
          if (selectedExpense?.id === exp.id) setSelectedExpense(null);
        },
      },
    ],
    [isAr, isFr, deleteFreelanceExpense, selectedExpense]
  );

  const expenseColumns: ColumnDefinition<FreelanceExpense>[] = useMemo(
    () => [
      {
        key: 'vendor',
        header: t('free_fin_vendor_service', language),
        width: '2.2*',
        minWidth: '180px',
        sortable: true,
        renderCell: (exp) => {
          const isPinned = pinnedExpenseIds.has(exp.id);
          return (
            <div className="flex items-center gap-3 min-w-0">
              {isPinned && <span className="w-1.5 h-6 rounded-full bg-[#d4522f] shrink-0" />}
              <div
                data-sq="ctl-sm"
                data-sq-border="none"
                className="w-8 h-8 bg-[#F5F1EC] dark:bg-[#2B2825] flex items-center justify-center text-black/70 dark:text-white/75 font-semibold t-small shrink-0"
              >
                {exp.vendor.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold t-label text-black dark:text-white truncate flex items-center gap-2">
                  <span>{exp.vendor}</span>
                  {exp.receiptFileName && (
                    <FileCheck2
                      size={12}
                      className="text-emerald-600 dark:text-emerald-400 shrink-0"
                      aria-label={t('free_depth_exp_receipt_attached', language)}
                    />
                  )}
                  {isPinned && <Pin size={11} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] shrink-0" />}
                </div>
                <div className="t-cap text-black/55 dark:text-white/55 truncate">
                  {exp.description}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        width: '1.3*',
        minWidth: '120px',
        sortable: true,
        renderCell: (exp) => {
          const bInfo = resolveRecordBranch(exp, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full t-small font-medium bg-[#F3EDE7] dark:bg-[#2B2825] text-black dark:text-white truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              {bInfo.name}
            </span>
          );
        },
      },
      {
        key: 'category',
        header: t('free_fin_expense_category', language),
        width: '1.5*',
        minWidth: '120px',
        sortable: true,
        renderCell: (exp) => (
          <span className="inline-block px-2.5 py-1 rounded-full t-small font-semibold bg-[#EFE9E2] dark:bg-[#2B2825] text-black/70 dark:text-white/75">
            {exp.category}
          </span>
        ),
      },
      {
        key: 'amount',
        header: t('common_amount', language),
        width: '1.4*',
        minWidth: '120px',
        sortable: true,
        renderCell: (exp) => (
          <div className="tabular-nums font-semibold t-label text-black dark:text-white">
            {formatCurrencyAmount(exp.amount, exp.currency)}
          </div>
        ),
      },
      {
        key: 'date',
        header: isAr ? 'التاريخ' : 'Date',
        width: '1.2*',
        minWidth: '105px',
        sortable: true,
        renderCell: (exp) => (
          <span className="t-cap text-black/55 dark:text-white/55 tabular-nums">
            {exp.date || '2026-02-15'}
          </span>
        ),
      },
      {
        key: 'deductible',
        header: t('free_fin_deductible', language),
        width: '1.3*',
        minWidth: '110px',
        renderCell: (exp) =>
          exp.isTaxDeductible ? (
            <span className="inline-flex items-center gap-1 t-small font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={13} />
              <span>{isAr ? 'معفى' : isFr ? 'Oui' : 'Deductible'}</span>
            </span>
          ) : (
            <span className="t-cap text-black/55 dark:text-white/55">
              {isAr ? 'لا' : isFr ? 'Non' : 'No'}
            </span>
          ),
      },
    ],
    [language, pinnedExpenseIds, t, branchesById, currentBranch, isAr, isFr]
  );

  const categoryOptions = useMemo(
    () => [
      { value: 'All', label: isAr ? 'الكل' : isFr ? 'Tous' : 'All' },
      { value: 'Software', label: isAr ? 'برمجيات' : isFr ? 'Logiciels' : 'Software' },
      { value: 'Office', label: isAr ? 'مكتب' : isFr ? 'Espace' : 'Office' },
      { value: 'Hardware', label: isAr ? 'معدات' : isFr ? 'Matériel' : 'Hardware' },
      { value: 'Subcontractor', label: isAr ? 'تعاقد' : isFr ? 'Sous-traitance' : 'Contractors' },
    ],
    [isAr, isFr]
  );

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOpts = [
      {
        value: 'All',
        label: isAr ? 'كل الفروع' : isFr ? 'Toutes les branches' : 'All Branches',
        count: freelanceExpenses.length,
      },
      ...Array.from(branchCounts.entries()).map(([name, count]) => ({
        value: name,
        label: name,
        count,
      })),
    ];

    return [
      {
        id: 'branch',
        label: isAr ? 'الفرع / الموقع' : isFr ? 'Branche' : 'Branch',
        value: branchFilter,
        onChange: setBranchFilter,
        resetValue: 'All',
        kind: 'tiles',
        columns: 2,
        options: branchOpts,
      },
      {
        id: 'category',
        label: t('free_fin_expense_category', language),
        value: categoryFilter,
        onChange: setCategoryFilter,
        resetValue: 'All',
        kind: 'segmented',
        options: categoryOptions.map((o) => ({ value: o.value, label: o.label })),
      },
      {
        id: 'deductible',
        label: t('free_fin_deductible', language),
        value: deductibleFilter,
        onChange: setDeductibleFilter,
        resetValue: 'all',
        kind: 'segmented',
        options: [
          { value: 'all', label: t('common_all', language) },
          { value: 'deductible', label: isAr ? 'معفى ضريبياً' : isFr ? 'Déductible' : 'Deductible' },
          { value: 'non_deductible', label: isAr ? 'غير معفى' : isFr ? 'Non déductible' : 'Standard' },
        ],
      },
    ];
  }, [
    isAr,
    isFr,
    freelanceExpenses.length,
    branchCounts,
    branchFilter,
    categoryFilter,
    categoryOptions,
    deductibleFilter,
    t,
    language,
  ]);

  const activeChips: ActiveFilterChip[] = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (branchFilter !== 'All') {
      chips.push({
        key: 'branch',
        label: `${isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch'}: ${branchFilter}`,
        onRemove: () => setBranchFilter('All'),
      });
    }
    if (categoryFilter !== 'All') {
      const m = categoryOptions.find((c) => c.value === categoryFilter);
      chips.push({
        key: 'category',
        label: m?.label || categoryFilter,
        onRemove: () => setCategoryFilter('All'),
      });
    }
    if (deductibleFilter !== 'all') {
      chips.push({
        key: 'deductible',
        label:
          deductibleFilter === 'deductible'
            ? isAr
              ? 'معفى'
              : isFr
              ? 'Déductible'
              : 'Deductible'
            : isAr
            ? 'غير معفى'
            : isFr
            ? 'Non déductible'
            : 'Non-deductible',
        onRemove: () => setDeductibleFilter('all'),
      });
    }
    return chips;
  }, [branchFilter, categoryFilter, deductibleFilter, categoryOptions, isAr, isFr]);

  const activeFiltersCount =
    (branchFilter !== 'All' ? 1 : 0) +
    (categoryFilter !== 'All' ? 1 : 0) +
    (deductibleFilter !== 'all' ? 1 : 0);

  const { showSkeleton, isTimedOut, isOffline, retry } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: freelanceExpenses.length > 0 || freelanceInvoices.length > 0,
  });

  if (
    showSkeleton &&
    ((freelanceExpenses.length === 0 && freelanceInvoices.length === 0) ||
      networkMode === 'force_skeleton')
  ) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '180px' },
          { width: '2*', minWidth: '150px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '100px', minWidth: '80px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={140}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync || retry}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<Wallet size={22} />}
        title={t('free_fin_title', language)}
        primaryAction={{
          label: t('free_fin_btn_add_expense', language),
          onClick: () => setIsAddExpenseModalOpen(true),
          icon: <Plus size={16} strokeWidth={2.2} />,
          dataAction: 'add-freelance-expense',
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'ملخص السيولة والتدفقات المالية'
            : isFr
            ? 'Trésorerie & Encaissements Multi-Devises'
            : 'Cashflow & Revenue Overview'
        }
        language={language}
        primaryCard={{
          label: isAr
            ? 'اليورو المحصّل (SEPA)'
            : isFr
            ? 'EUR Encaissé (SEPA)'
            : 'EUR Collected',
          badgeText: 'SEPA Wire',
          count: Math.round(currencyTotals.eur),
          formatValue: (n) => `€${n.toLocaleString()}`,
          tone: 'emerald',
          isActive: deductibleFilter === 'deductible',
          onToggle: () =>
            setDeductibleFilter((prev) => (prev === 'deductible' ? 'all' : 'deductible')),
        }}
        secondaryCard={{
          label: t('free_fin_operational_overhead', language),
          badgeText: `${freelanceExpenses.length} ${isAr ? 'مصاريف' : 'charges'}`,
          count: totalExpensesEurEquiv,
          formatValue: (n) => `€${n.toLocaleString()}`,
          tone: 'terracotta',
          isActive: categoryFilter === 'Software',
          onToggle: () =>
            setCategoryFilter((prev) => (prev === 'Software' ? 'All' : 'Software')),
        }}
        darkCard={{
          label: isAr
            ? 'صافي الدخل التقديري'
            : isFr
            ? 'Bénéfice Net Projeté'
            : 'Net Take-Home',
          badgeCount: taxRate,
          badgePrefix: '',
          badgeSuffix: `% ${isAr ? 'احتياطي' : 'provision'}`,
          valueCount: netTakeHomeEur,
          formatValue: (n) => `€${n.toLocaleString()}`,
          caption: isAr
            ? `احتياطي ضريبي: €${taxReserveAmount.toLocaleString()}`
            : `Provision fiscale: €${taxReserveAmount.toLocaleString()}`,
        }}
      />

      {/* Tax Reserve & Net Earnings Simulation Pod */}
      <ScreenPod>
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
              <h3 className="t-label font-semibold text-black dark:text-white">
                {isAr
                  ? 'الاحتياطي الضريبي ومحاكاة الأرباح الصافية'
                  : isFr
                  ? 'Provision Fiscale & Simulation du Bénéfice Net'
                  : 'Tax Reserve & Net Earnings Simulation'}
              </h3>
            </div>
            <div className="flex items-center gap-2 t-cap tabular-nums">
              <span className="text-black/55 dark:text-white/55">
                {t('free_fin_tax_reserve', language)}:
              </span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                €{taxReserveAmount.toLocaleString()} ({taxRate}%)
              </span>
            </div>
          </div>

          <div className="sq-elev-card">
            <div
              data-sq="card"
              data-sq-border="solid"
              className="bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] p-4 lg:p-5 space-y-3"
            >
            <div className="flex items-center justify-between t-cap text-black/70 dark:text-white/75">
              <span className="font-medium">
                {isAr
                  ? 'معدل الضريبة التقديري والاشتراكات الاجتماعية'
                  : isFr
                  ? "Curseur de taux d'imposition estimé"
                  : 'Tax Rate & Social Contributions Slider'}
              </span>
              <span className="font-semibold tabular-nums text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] t-label">
                {taxRate}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="35"
              step="1"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
              aria-label="Tax Rate Slider"
              className="w-full accent-[#d4522f] h-2 bg-[#EFE9E2] dark:bg-[#2B2825] rounded-full cursor-pointer"
            />
            <div className="flex justify-between t-cap text-black/55 dark:text-white/55 tabular-nums">
              <span>0% ({t('free_fin_tax_exempt_label', language)})</span>
              <span>10% ({t('free_fin_tax_auto_entrepreneur_label', language)})</span>
              <span>20% ({t('free_fin_tax_standard_solo_label', language)})</span>
              <span>35% ({t('free_fin_tax_high_bracket_label', language)})</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[var(--atr-divider)] t-cap">
              <div>
                <span className="text-black/55 dark:text-white/55 block">
                  {t('free_fin_gross_revenue_equiv', language)}
                </span>
                <span className="t-card font-semibold tabular-nums text-black dark:text-white">
                  €{currencyTotals.totalEurEquiv.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-black/55 dark:text-white/55 block">
                  {t('free_fin_expenses_total', language)}
                </span>
                <span className="t-card font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                  -€{totalExpensesEurEquiv.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-black/55 dark:text-white/55 block">
                  {t('free_fin_net_hourly_yield', language)}
                </span>
                <span className="t-card font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  €{netEhr}
                  {t('free_dash_per_hour', language)}{' '}
                  <span className="t-cap font-normal text-black/55 dark:text-white/55">
                    ({t('free_fin_gross_label', language)} €{grossEhr}
                    {t('free_dash_per_hour', language)})
                  </span>
                </span>
              </div>
            </div>
            </div>
          </div>
        </div>
      </ScreenPod>

      {/* Auto-Entrepreneur Statutory Ceiling & Rates Pod */}
      <ScreenPod>
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <BadgeCheck size={16} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
              <h3 className="t-label font-semibold text-black dark:text-white">
                {t('free_depth_ae_pod_title', language)}
              </h3>
              {aeSummary.isUnverified ? (
                <span
                  data-testid="finance-ae-unverified-badge"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full t-small font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                >
                  <AlertTriangle size={12} />
                  <span>{t('free_depth_ae_unverified_warn', language)}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full t-small font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 size={12} />
                  <span>{t('free_depth_ae_verified_badge', language)}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {aeSummary.isUnverified && (
                <AtriumButton
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={<BadgeCheck size={14} />}
                  onClick={() => markFreelanceAeConfigVerified(aeSummary.activeConfig.id)}
                >
                  {t('free_depth_ae_verify_btn', language)}
                </AtriumButton>
              )}
              <AtriumButton
                type="button"
                variant="secondary"
                size="sm"
                icon={<SlidersHorizontal size={14} />}
                onClick={() => {
                  setAeEffectiveFrom(aeSummary.activeConfig.effectiveFrom);
                  setAeCeilingDzd(aeSummary.annualCeilingDzd);
                  setAeContribPct(aeSummary.activeConfig.contributionRatePct);
                  setAeTaxPct(aeSummary.activeConfig.taxRatePct);
                  setAeSpecialty(aeSummary.activeConfig.tradeSpecialty || '');
                  setAeVerifyOnSave(aeSummary.activeConfig.verificationStatus === 'verified');
                  setIsAeModalOpen(true);
                }}
              >
                {t('free_depth_ae_config_btn', language)}
              </AtriumButton>
            </div>
          </div>

          <div className="sq-elev-card">
            <div
              data-sq="card"
              data-sq-border="solid"
              className="bg-white dark:bg-[#22201E] [--sq-stroke:var(--sq-stroke-card)] p-4 lg:p-5 space-y-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between t-cap tabular-nums">
                  <span className="text-black/65 dark:text-white/70">
                    {t('free_depth_ae_collected', language)}:{' '}
                    <strong className="text-black dark:text-white">
                      {aeSummary.collectedTurnoverDzd.toLocaleString()} DZD
                    </strong>
                  </span>
                  <span className="text-black/65 dark:text-white/70">
                    {t('free_depth_ae_ceiling', language)}:{' '}
                    <strong className="text-black dark:text-white">
                      {aeSummary.annualCeilingDzd.toLocaleString()} DZD
                    </strong>{' '}
                    ({aeSummary.utilizationPct}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#EFE9E2] dark:bg-[#2B2825] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      aeSummary.isOverCeiling
                        ? 'bg-rose-600'
                        : aeSummary.isApproachingCeiling
                        ? 'bg-amber-500'
                        : 'bg-[#d4522f]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, aeSummary.utilizationPct))}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[var(--atr-divider)] t-cap tabular-nums">
                <div>
                  <span className="text-black/55 dark:text-white/55 block">
                    {t('free_depth_ae_remaining', language)}
                  </span>
                  <span className="font-semibold text-black dark:text-white">
                    {aeSummary.remainingHeadroomDzd.toLocaleString()} DZD
                  </span>
                </div>
                <div>
                  <span className="text-black/55 dark:text-white/55 block">
                    {t('free_depth_ae_contrib_est', language)} ({aeSummary.activeConfig.contributionRatePct}%)
                  </span>
                  <span className="font-semibold text-black dark:text-white">
                    {aeSummary.estimatedContributionDzd.toLocaleString()} DZD
                  </span>
                </div>
                <div>
                  <span className="text-black/55 dark:text-white/55 block">
                    {t('free_depth_ae_tax_est', language)} ({aeSummary.activeConfig.taxRatePct}%)
                  </span>
                  <span className="font-semibold text-black dark:text-white">
                    {aeSummary.estimatedTaxDzd.toLocaleString()} DZD
                  </span>
                </div>
                <div>
                  <span className="text-black/55 dark:text-white/55 block">
                    {t('free_depth_ae_effective_from', language)}
                  </span>
                  <span className="font-semibold text-black dark:text-white">
                    {aeSummary.activeConfig.effectiveFrom}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScreenPod>

      <ScreenPod>
        <ScreenCollectionToolbar
          title={t('free_fin_operational_overhead', language)}
          liveRegionText={`${sortedExpenses.length} ${isAr ? 'مصاريف' : 'expenses'}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('free_fin_ph_vendor', language) || 'Search vendor...'}
          statusOptions={categoryOptions}
          statusValue={categoryFilter}
          onStatusChange={setCategoryFilter}
          hasActiveAdvancedFilters={activeFiltersCount > 0}
          activeFiltersCount={activeFiltersCount}
          isFilterModalOpen={isFilterModalOpen}
          filterButtonRef={filterButtonRef}
          onToggleFilterModal={() => setIsFilterModalOpen((v) => !v)}
          viewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m === 'grid' ? 'grid' : 'list')}
          onExport={handleExportCSV}
          activeChips={activeChips}
          onResetAllFilters={() => {
            setBranchFilter('All');
            setCategoryFilter('All');
            setDeductibleFilter('all');
            setSearchQuery('');
          }}
        />

        {selectedExpenseIds.size > 0 && (
          <div className="sq-elev-pop animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div
              data-sq="card"
              data-sq-border="none"
              className="flex items-center justify-between p-3 px-4 bg-[#191716] text-white"
            >
            <div className="flex items-center gap-3 t-small font-semibold">
              <span className="px-2 py-1 rounded-full bg-[var(--brand-fill,#C9461F)] text-white font-semibold t-small">
                {selectedExpenseIds.size}
              </span>
              <span>
                {isAr
                  ? 'مصاريف محددة'
                  : isFr
                  ? 'charges sélectionnées'
                  : 'expenses selected'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedExpenseIds(new Set())}
                className="text-white/75 hover:text-white underline t-cap cursor-pointer ml-1"
              >
                {isAr ? 'إلغاء التحديد' : isFr ? 'Désélectionner' : 'Deselect all'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchDeleteExpenses}
                className="h-8 px-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white t-small font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>{isAr ? 'حذف المحدد' : isFr ? 'Supprimer' : 'Batch Delete'}</span>
              </button>
            </div>
            </div>
          </div>
        )}

        <UniversalDataCollection<FreelanceExpense>
          hideToolbar
          items={sortedExpenses}
          keyExtractor={(exp) => exp.id}
          viewMode={viewMode === 'grid' ? 'grid' : 'list'}
          defaultViewMode={viewMode === 'grid' ? 'grid' : 'list'}
          columns={expenseColumns}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          selectedIds={selectedExpenseIds}
          onSelectionChange={setSelectedExpenseIds}
          pinnedIds={pinnedExpenseIds}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            setPinnedExpenseIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onItemClick={(exp, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedExpense(exp);
            setInspectorTab('overview');
          }}
          onViewDetails={(exp, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedExpense(exp);
            setInspectorTab('overview');
          }}
          getRowMeta={getExpenseRowMeta}
          getFanActions={getExpenseFanActions}
          getDetailActions={getExpenseDetailActions}
          onDelete={(exp) => {
            deleteFreelanceExpense(exp.id);
            if (selectedExpense?.id === exp.id) setSelectedExpense(null);
          }}
          openItemId={activeExpense?.id ?? null}
          sortBy={expenseSortBy}
          sortDirection={expenseSortDir}
          onSortChange={(colKey, dir) => {
            setExpenseSortBy(colKey);
            setExpenseSortDir(dir);
          }}
          emptyTitle={t('free_fin_empty_expenses', language)}
          emptyDescription={t('free_fin_empty_expenses_desc', language)}
          primaryActionLabel={t('free_fin_btn_add_expense', language)}
          onAddFirstItem={() => setIsAddExpenseModalOpen(true)}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedExpenses.length}
        entityPluralLabel={isAr ? 'مصاريف' : 'charges'}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setCategoryFilter('All');
          setDeductibleFilter('all');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<FreelanceExpense>
        isOpen={Boolean(activeExpense)}
        item={activeExpense}
        allItems={sortedExpenses}
        keyExtractor={(exp) => exp.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeExpense?.vendor || ''}
        subtitle={activeExpense?.description || ''}
        categoryLabel={activeExpense?.category || 'Charge'}
        avatarText={activeExpense ? activeExpense.vendor.slice(0, 2).toUpperCase() : 'EX'}
        avatarColor="#d4522f"
        branchName={
          activeExpense
            ? resolveRecordBranch(activeExpense, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeExpense?.isTaxDeductible
            ? isAr
              ? 'معفى ضريبياً'
              : isFr
              ? 'Déductible'
              : 'Deductible'
            : isAr
            ? 'قياسي'
            : isFr
            ? 'Standard'
            : 'Standard'
        }
        statusClassName={
          activeExpense?.isTaxDeductible
            ? 'bg-[#DDF5E8] dark:bg-[#143324] text-[#0B7A45] dark:text-[#4ADE80]'
            : 'bg-[#FCEFD2] dark:bg-[#3A2E14] text-[#8A5A06] dark:text-[#FFD166]'
        }
        tabs={[
          { id: 'overview', label: isAr ? 'نظرة عامة' : isFr ? 'Aperçu' : 'Overview' },
          { id: 'tax', label: isAr ? 'الضريبة' : isFr ? 'Fiscalité' : 'Tax & Ledger' },
          { id: 'actions', label: isAr ? 'إجراءات' : 'Actions' },
        ]}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        onSelectItem={(exp) => {
          setSelectedExpense(exp);
          setInspectorTab('overview');
        }}
        onClose={() => setSelectedExpense(null)}
        onDelete={(exp) => {
          deleteFreelanceExpense(exp.id);
          setSelectedExpense(null);
        }}
        holdToDelete={true}
        renderBody={(exp, tab) => {
          const eurEquiv =
            exp.currency === 'EUR'
              ? exp.amount
              : exp.currency === 'USD'
              ? Math.round(exp.amount / 1.08)
              : Math.round(exp.amount / 230);
          if (tab === 'tax') {
            return (
              <>
                <InspectorSection index={0}>
                  <InspectorBigStat
                    value={formatCurrencyAmount(exp.amount, exp.currency)}
                    tone={exp.isTaxDeductible ? 'ok' : 'accent'}
                    caption={`${isAr ? 'المعادل باليورو' : isFr ? 'Équivalent EUR' : 'EUR Equivalent'}: €${eurEquiv.toLocaleString()}`}
                  />
                </InspectorSection>
                <InspectorSection
                  index={1}
                  title={isAr ? 'التصنيف الضريبي' : isFr ? 'Traitement Fiscal' : 'Fiscal Classification'}
                >
                  <InspectorCard>
                    <InspectorKeyValue
                      label={t('free_fin_deductible', language)}
                      value={
                        exp.isTaxDeductible
                          ? isAr
                            ? 'نعم (قابل للخصم)'
                            : isFr
                            ? 'Oui — Charge déductible'
                            : 'Yes — Tax Deductible'
                          : isAr
                          ? 'لا'
                          : 'No'
                      }
                      tone={exp.isTaxDeductible ? 'ok' : 'warn'}
                    />
                    <InspectorKeyValue
                      label={isAr ? 'الأثر على الاحتياطي الضريبي' : isFr ? 'Impact provision fiscale' : 'Tax Provision Impact'}
                      value={exp.isTaxDeductible ? `-€${Math.round(eurEquiv * (taxRate / 100)).toLocaleString()}` : '€0'}
                      mono
                      isLast
                    />
                  </InspectorCard>
                </InspectorSection>
              </>
            );
          }
          if (tab === 'actions') {
            return (
              <>
                <InspectorSection index={0} title={isAr ? 'إجراءات سريعة' : isFr ? 'Actions Rapides' : 'Quick Actions'}>
                  <InspectorQuickActions
                    actions={[
                      {
                        id: 'pin',
                        label: pinnedExpenseIds.has(exp.id)
                          ? isAr
                            ? 'إلغاء التثبيت'
                            : 'Unpin'
                          : isAr
                          ? 'تثبيت'
                          : 'Pin',
                        icon: <Pin size={16} />,
                        primary: true,
                        onClick: () =>
                          setPinnedExpenseIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(exp.id)) next.delete(exp.id);
                            else next.add(exp.id);
                            return next;
                          }),
                      },
                      {
                        id: 'export',
                        label: 'CSV',
                        icon: <Wallet size={16} />,
                        onClick: handleExportCSV,
                      },
                    ]}
                  />
                </InspectorSection>
                <InspectorSection index={1}>
                  <InspectorWideButton
                    label={t('common_delete', language)}
                    icon={<Trash2 size={14} />}
                    tone="neutral"
                    onClick={() => {
                      deleteFreelanceExpense(exp.id);
                      setSelectedExpense(null);
                    }}
                  />
                </InspectorSection>
              </>
            );
          }
          return (
            <>
              <InspectorSection index={0}>
                <InspectorBigStat
                  value={formatCurrencyAmount(exp.amount, exp.currency)}
                  tone="accent"
                  caption={exp.description}
                />
              </InspectorSection>
              <InspectorSection
                index={1}
                title={isAr ? 'تفاصيل المصروف' : isFr ? 'Détails de la Dépense' : 'Expense Details'}
              >
                <InspectorCard>
                  <InspectorKeyValue
                    label={t('free_fin_vendor_label', language)}
                    value={exp.vendor}
                  />
                  <InspectorKeyValue
                    label={t('free_fin_expense_category', language)}
                    value={exp.category}
                  />
                  <InspectorKeyValue
                    label={isAr ? 'التاريخ' : 'Date'}
                    value={exp.date || '2026-02-15'}
                    mono
                  />
                  <InspectorKeyValue
                    label={t('common_currency', language)}
                    value={exp.currency}
                  />
                  <InspectorKeyValue
                    label={t('free_depth_exp_receipt', language)}
                    value={exp.receiptFileName || t('free_depth_exp_receipt_none', language)}
                    tone={exp.receiptFileName ? 'ok' : undefined}
                    isLast
                  />
                </InspectorCard>
              </InspectorSection>
              <InspectorSection index={2} title={t('free_depth_exp_receipt', language)}>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F1EC] dark:bg-[#2B2825] text-black dark:text-white t-small font-semibold cursor-pointer hover:bg-[#EAE3DA] dark:hover:bg-[#35312D] transition-colors">
                  <Upload size={14} />
                  <span>
                    {isUploadingReceipt
                      ? '...'
                      : exp.receiptFileName
                      ? exp.receiptFileName
                      : t('free_depth_exp_receipt_upload', language)}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="sr-only"
                    disabled={isUploadingReceipt}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      handleAttachInspectorReceipt(exp.id, file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </InspectorSection>
            </>
          );
        }}
      />

      {/* Add Expense Modal */}
      <KineticModalShell
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        maxWidthClass="max-w-md"
        zIndexClass="z-50"
        scrimClassName="bg-black/60"
        ariaLabel={t('free_fin_modal_expense_title', language)}
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full max-h-[92vh] overflow-y-auto p-6 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
            <h3 className="t-card font-semibold text-black dark:text-white">
              {t('free_fin_modal_expense_title', language)}
            </h3>
            <button
              type="button"
              onClick={() => setIsAddExpenseModalOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white cursor-pointer"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreateExpense} className="space-y-4 t-cap">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="Vendor"
                label={`${t('free_fin_vendor_label', language)} *`}
                required
                placeholder={t('free_fin_ph_vendor', language)}
                value={vendor}
                onChange={setVendor}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelSelect
                field="Category"
                label={`${t('free_fin_expense_category', language)} *`}
                value={category}
                onChange={(val) => setCategory(val as ExpenseCategory)}
                options={[
                  { value: 'Software', label: t('free_fin_expense_software', language) },
                  { value: 'Office', label: t('free_fin_expense_workspace', language) },
                  { value: 'Hardware', label: t('free_fin_expense_hardware', language) },
                  {
                    value: 'Subcontractor',
                    label: t('free_fin_expense_subcontractor', language),
                  },
                  { value: 'Travel', label: t('free_fin_expense_travel', language) },
                  { value: 'Other', label: t('free_fin_expense_other', language) },
                ]}
                height={40}
                corner={12}
              />
            </div>
            <LabelInput
              field="Description"
              label={`${t('free_fin_expense_desc', language)} *`}
              required
              placeholder={t('free_fin_ph_expense_desc_full', language)}
              value={description}
              onChange={setDescription}
              width="100%"
              height={40}
              corner={12}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="Amount"
                label={`${t('common_amount', language)} *`}
                type="number"
                required
                value={String(amount)}
                onChange={(val) => setAmount(Number(val) || 0)}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelSelect
                field="Currency"
                label={`${t('common_currency', language)} *`}
                value={currency}
                onChange={(val) => setCurrency(val as CurrencyCode)}
                options={[
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'DZD', label: 'DZD (DA)' },
                ]}
                height={40}
                corner={12}
              />
            </div>
            <div
              data-sq="ctl"
              data-sq-border="none"
              className="flex items-center justify-between gap-3 p-3 bg-[#F5F1EC] dark:bg-[#22201E]"
            >
              <span className="font-medium text-black/75 dark:text-white/80">
                {t('free_fin_tax_deductible_prompt', language)}
              </span>
              <LiveSwitch
                checked={isTaxDeductible}
                onCheckedChange={setIsTaxDeductible}
                aria-label={t('free_fin_tax_deductible_prompt', language)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="inline-flex items-center justify-between w-full gap-2 px-3.5 py-2.5 rounded-xl bg-[#F5F1EC] dark:bg-[#22201E] text-black/80 dark:text-white/85 t-small font-medium cursor-pointer hover:bg-[#ECE5DC] dark:hover:bg-[#2B2825] transition-colors">
                <span className="flex items-center gap-2 truncate">
                  <Upload size={14} />
                  <span>
                    {pendingReceiptFile
                      ? pendingReceiptFile.name
                      : t('free_depth_exp_receipt_upload', language)}
                  </span>
                </span>
                <span className="t-small text-black/50 dark:text-white/50 shrink-0">PDF / IMG</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(e) => handleSelectModalReceipt(e.target.files?.[0])}
                />
              </label>
              {receiptValidationError && (
                <p className="t-small text-rose-600 dark:text-rose-400">{receiptValidationError}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsAddExpenseModalOpen(false)}>
                {t('action_cancel', language)}
              </Button>
              <Button type="submit" tone="accent" size={40}>
                {t('free_fin_btn_save_expense', language)}
              </Button>
            </div>
          </form>
        </div>
      </KineticModalShell>

      {/* Auto-Entrepreneur Statutory Config Modal */}
      <KineticModalShell
        isOpen={isAeModalOpen}
        onClose={() => setIsAeModalOpen(false)}
        maxWidthClass="max-w-md"
        zIndexClass="z-[60]"
        scrimClassName="bg-black/60"
        ariaLabel={t('free_depth_ae_config_btn', language)}
      >
        <div
          data-sq="panel"
          data-sq-border="solid"
          className="bg-white dark:bg-[#262422] [--sq-stroke:var(--sq-stroke-pop)] w-full p-6 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--atr-divider)]">
            <h3 className="t-card font-semibold text-black dark:text-white">
              {t('free_depth_ae_config_btn', language)}
            </h3>
            <button
              type="button"
              onClick={() => setIsAeModalOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white cursor-pointer"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSaveAeConfig} className="space-y-4 t-cap">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="AeEffectiveFrom"
                label={t('free_depth_ae_effective_from', language)}
                type="date"
                required
                value={aeEffectiveFrom}
                onChange={setAeEffectiveFrom}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                field="AeCeilingDzd"
                label={`${t('free_depth_ae_ceiling', language)} (DZD)`}
                type="number"
                min={100000}
                required
                value={String(aeCeilingDzd)}
                onChange={(v) => setAeCeilingDzd(Number(v) || 5000000)}
                width="100%"
                height={40}
                corner={12}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabelInput
                field="AeContribPct"
                label={t('free_depth_ae_contrib_pct', language)}
                type="number"
                min={0}
                max={100}
                step="0.1"
                required
                value={String(aeContribPct)}
                onChange={(v) => setAeContribPct(Number(v) || 0)}
                width="100%"
                height={40}
                corner={12}
              />
              <LabelInput
                field="AeTaxPct"
                label={t('free_depth_ae_tax_pct', language)}
                type="number"
                min={0}
                max={100}
                step="0.1"
                required
                value={String(aeTaxPct)}
                onChange={(v) => setAeTaxPct(Number(v) || 0)}
                width="100%"
                height={40}
                corner={12}
              />
            </div>
            <LabelInput
              field="AeSpecialty"
              label={isAr ? 'التخصص المهني' : isFr ? 'Activité / Spécialité' : 'Trade Specialty'}
              value={aeSpecialty}
              onChange={setAeSpecialty}
              width="100%"
              height={40}
              corner={12}
            />
            <div
              data-sq="ctl"
              data-sq-border="none"
              className="flex items-center justify-between gap-3 p-3 bg-[#F5F1EC] dark:bg-[#22201E]"
            >
              <span className="font-medium text-black/80 dark:text-white/85">
                {t('free_depth_ae_verify_btn', language)}
              </span>
              <LiveSwitch
                checked={aeVerifyOnSave}
                onCheckedChange={setAeVerifyOnSave}
                aria-label={t('free_depth_ae_verify_btn', language)}
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--atr-divider)]">
              <Button type="button" tone="soft" size={40} onClick={() => setIsAeModalOpen(false)}>
                {t('action_cancel', language)}
              </Button>
              <Button type="submit" tone="accent" size={40}>
                {t('common_save', language)}
              </Button>
            </div>
          </form>
        </div>
      </KineticModalShell>
    </div>
  );
};
