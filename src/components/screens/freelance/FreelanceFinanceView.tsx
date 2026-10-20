import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatCurrencyAmount } from '../../../utils/rules';
import { FreelanceExpense, ExpenseCategory, CurrencyCode } from '../../../types/index';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { useTranslation } from '../../../utils/useTranslation';

export const FreelanceFinanceView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    freelanceInvoices,
    freelanceExpenses,
    timeLogs,
    addFreelanceExpense,
    deleteFreelanceExpense,
  } = useAtriumStore();

  const [taxRate, setTaxRate] = useState<number>(20); // 20% estimated tax provision
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);

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

        <button
          type="button"
          onClick={() => setIsAddExpenseModalOpen(true)}
          className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>{t('free_fin_btn_add_expense', language)}</span>
        </button>
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
              {language === 'ar' ? 'إجمالي الإيرادات المعادلة' : language === 'fr' ? 'Revenu brut équivalent' : 'Gross Revenue Equiv.'}
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
              {language === 'ar' ? 'صافي العائد بالساعة (EHR)' : language === 'fr' ? 'Rendement horaire net (EHR)' : 'Net Hourly Yield (EHR)'}
            </span>
            <span className="text-base font-bold font-mono text-emerald-400 tabular-nums">
              €{netEhr}{t('free_dash_per_hour', language)} ({t('free_fin_gross_label', language)} €{grossEhr}{t('free_dash_per_hour', language)})
            </span>
          </div>
        </div>
      </div>

      {/* Overhead & Subscriptions Ledger Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            {language === 'ar' ? 'نفقات التشغيل والاشتراكات البرمجية' : language === 'fr' ? 'Charges opérationnelles & Abonnements' : 'Operational Overhead & Subscriptions'} ({freelanceExpenses.length})
          </h3>
          <span className="text-xs text-neutral-500">
            {language === 'ar' ? 'التكلفة الإجمالية' : language === 'fr' ? 'Coût mensuel total' : 'Total monthly cost'}: ~€{totalExpensesEurEquiv.toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className={`pb-3 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'المورد / الخدمة' : language === 'fr' ? 'Fournisseur / Service' : 'Vendor / Service'}</th>
                <th className={`pb-3 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{t('free_fin_expense_category', language)}</th>
                <th className={`pb-3 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{language === 'ar' ? 'الوصف' : language === 'fr' ? 'Description' : 'Description'}</th>
                <th className={`pb-3 font-semibold ${isRtl ? 'text-left' : 'text-right'}`}>{t('common_amount', language)}</th>
                <th className="pb-3 font-semibold text-center">{t('free_fin_deductible', language)}</th>
                <th className={`pb-3 font-semibold ${isRtl ? 'text-left' : 'text-right'}`}>{t('common_action', language)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {freelanceExpenses.map((exp) => (
                <tr
                  key={exp.id}
                  className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <td className="py-3 font-bold text-neutral-900 dark:text-white">
                    {exp.vendor}
                  </td>
                  <td className="py-3 text-neutral-600 dark:text-neutral-400">
                    {exp.category === 'Software'
                      ? t('free_fin_expense_software', language)
                      : exp.category === 'Hardware'
                      ? t('free_fin_expense_hardware', language)
                      : exp.category === 'Office'
                      ? t('free_fin_expense_workspace', language)
                      : exp.category === 'Subcontractor'
                      ? (language === 'ar' ? 'مقاول من الباطن' : language === 'fr' ? 'Sous-traitance' : 'Subcontractor')
                      : exp.category === 'Travel'
                      ? (language === 'ar' ? 'سفريات ومهمات' : language === 'fr' ? 'Déplacements' : 'Travel')
                      : t('free_fin_expense_other', language)}
                  </td>
                  <td className="py-3 text-neutral-500 max-w-xs truncate">
                    {exp.description}
                  </td>
                  <td className={`py-3 ${isRtl ? 'text-left' : 'text-right'} font-mono font-bold text-neutral-900 dark:text-white tabular-nums`}>
                    {formatCurrencyAmount(exp.amount, exp.currency)}
                  </td>
                  <td className="py-3 text-center">
                    {exp.isTaxDeductible ? (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {language === 'ar' ? 'نعم' : language === 'fr' ? 'Oui' : 'Yes'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-400">
                        {language === 'ar' ? 'لا' : language === 'fr' ? 'Non' : 'No'}
                      </span>
                    )}
                  </td>
                  <td className={`py-3 ${isRtl ? 'text-left' : 'text-right'}`}>
                    <button
                      type="button"
                      onClick={() => deleteFreelanceExpense(exp.id)}
                      className="text-neutral-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                      title={language === 'ar' ? 'حذف المصروف' : language === 'fr' ? 'Supprimer la charge' : 'Remove expense'}
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {freelanceExpenses.length === 0 && (
          <div className="py-10 text-center text-xs text-neutral-500 dark:text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
            <p className="font-semibold">{t('free_fin_empty_expenses', language)}</p>
            <p className="mt-1 text-[11px]">{t('free_fin_empty_expenses_desc', language)}</p>
          </div>
        )}
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
                    label={`${language === 'ar' ? 'المورد' : language === 'fr' ? 'Fournisseur' : 'Vendor'} *`}
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
                    { value: 'Subcontractor', label: language === 'ar' ? 'مقاول من الباطن' : language === 'fr' ? 'Sous-traitance' : 'Subcontractor' },
                    { value: 'Travel', label: language === 'ar' ? 'سفريات' : language === 'fr' ? 'Déplacements' : 'Travel' },
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
                  placeholder={language === 'ar' ? 'مثال: اشتراك في خدمات الذكاء الاصطناعي والحوسبة' : language === 'fr' ? 'Ex : Tokens API et hébergement prototype client' : 'e.g. API usage and inference tokens for client prototypes'}
                  value={description}
                  onChange={setDescription}
                  width="100%"
                  height={46}
                  corner={14}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <LabelInput
                    field="Amount"
                    label={`${t('free_fin_expense_amount', language)} *`}
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(val) => setAmount(Number(val?.target?.value || val || 0))}
                    width="100%"
                    height={46}
                    corner={14}
                  />
                </div>
                <LabelSelect
                  field="Currency"
                  label={t('free_clients_currency', language)}
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

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="taxDeduct"
                  checked={isTaxDeductible}
                  onChange={(e) => setIsTaxDeductible(e.target.checked)}
                  className="rounded text-[#C4785A]"
                />
                <label
                  htmlFor="taxDeduct"
                  className="font-medium text-neutral-700 dark:text-neutral-300"
                >
                  {t('free_fin_deductible', language)}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  {t('common_cancel', language)}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('common_save', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
