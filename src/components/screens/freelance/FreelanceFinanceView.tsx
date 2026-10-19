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

export const FreelanceFinanceView: React.FC = () => {
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
              Financial Health, Overhead & Tax Reserves
            </h1>
            <span className="text-xs text-neutral-500">
              Multi-currency cashflow, overhead subscriptions & net take-home forecast
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Simulate tax provisions and understand your true Effective Hourly Rate (EHR)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddExpenseModalOpen(true)}
          className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Add Tool / Overhead</span>
        </button>
      </div>

      {/* Multi-Currency Inflow Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            EUR Collected (SEPA Wire)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              €{currencyTotals.eur.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-500">Euro account</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            USD Collected (Direct Deposit)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
              ${currencyTotals.usd.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-500">US bank wire</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            DZD Collected (BaridiMob & Local)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-[#C4785A] tabular-nums">
              {currencyTotals.dzd.toLocaleString()} DZD
            </span>
            <span className="text-xs text-neutral-500">Algerian Dinars</span>
          </div>
        </div>
      </div>

      {/* Real-Time Net Take-Home & Tax Reserve Gauge */}
      <div className="p-6 rounded-3xl bg-neutral-900 dark:bg-black text-white border border-neutral-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              <ShieldCheck size={14} className="text-[#C4785A]" />
              <span>Tax Reserve & Net Earnings Simulation</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Estimated Net Take-Home: <span className="text-emerald-400 font-mono tabular-nums">€{netTakeHomeEur.toLocaleString()}</span>
            </h2>
          </div>

          <div className="text-right">
            <span className="text-xs text-neutral-400 block">Estimated Tax Provision</span>
            <span className="text-lg font-bold text-amber-400 font-mono tabular-nums">
              €{taxReserveAmount.toLocaleString()} ({taxRate}%)
            </span>
          </div>
        </div>

        {/* Interactive Tax Percentage Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-300">
            <span>Local / Flat Tax Rate Slider</span>
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
            <span>0% (Tax Holiday)</span>
            <span>10% (Micro-Enterprise)</span>
            <span>20% (Standard Solo)</span>
            <span>35% (High Bracket)</span>
          </div>
        </div>

        {/* 3-Column Profit Bridge Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-neutral-800 text-xs">
          <div>
            <span className="text-neutral-400 block">Gross Revenue Equiv.</span>
            <span className="text-base font-bold font-mono text-white tabular-nums">
              €{currencyTotals.totalEurEquiv.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-neutral-400 block">Overhead & Deductions</span>
            <span className="text-base font-bold font-mono text-rose-400 tabular-nums">
              -€{totalExpensesEurEquiv.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-neutral-400 block">Net Hourly Yield (EHR)</span>
            <span className="text-base font-bold font-mono text-emerald-400 tabular-nums">
              €{netEhr}/hr (Gross €{grossEhr}/hr)
            </span>
          </div>
        </div>
      </div>

      {/* Overhead & Subscriptions Ledger Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            Operational Overhead & Subscriptions ({freelanceExpenses.length})
          </h3>
          <span className="text-xs text-neutral-500">
            Total monthly cost: ~€{totalExpensesEurEquiv.toLocaleString()} equiv.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="pb-3 font-semibold">Vendor / Service</th>
                <th className="pb-3 font-semibold">Category</th>
                <th className="pb-3 font-semibold">Description</th>
                <th className="pb-3 font-semibold text-right">Cost</th>
                <th className="pb-3 font-semibold text-center">Tax Deductible</th>
                <th className="pb-3 font-semibold text-right">Action</th>
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
                    {exp.category}
                  </td>
                  <td className="py-3 text-neutral-500 max-w-xs truncate">
                    {exp.description}
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-neutral-900 dark:text-white tabular-nums">
                    {formatCurrencyAmount(exp.amount, exp.currency)}
                  </td>
                  <td className="py-3 text-center">
                    {exp.isTaxDeductible ? (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Yes
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-400">No</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => deleteFreelanceExpense(exp.id)}
                      className="text-neutral-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                      title="Remove expense"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Add Overhead / Expense
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
                    label="Vendor *"
                    required
                    placeholder="e.g. OpenAI / Claude"
                    value={vendor}
                    onChange={setVendor}
                    width="100%"
                    height={46}
                    corner={14}
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  >
                    <option value="Software">Software & SaaS</option>
                    <option value="Office">Office & Coworking</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Subcontractor">Subcontractor</option>
                    <option value="Travel">Travel</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <LabelInput
                  field="Description"
                  label="Description *"
                  required
                  placeholder="e.g. API usage and inference tokens for client prototypes"
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
                    label="Amount *"
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
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="DZD">DZD (DA)</option>
                  </select>
                </div>
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
                  Legitimate tax-deductible operational expense
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
