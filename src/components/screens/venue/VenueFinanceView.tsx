import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { SecurityDepositRecord } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { Seek } from '../../ui/Seek';

export const VenueFinanceView: React.FC = () => {
  const {
    securityDeposits,
    rentalBookings,
    releaseSecurityDeposit,
    deductSecurityDeposit,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Held' | 'Released' | 'Deducted'>('All');
  const [deductionTarget, setDeductionTarget] = useState<SecurityDepositRecord | null>(null);
  const [deductionReason, setDeductionReason] = useState('');
  const [deductionAmount, setDeductionAmount] = useState<number>(0);

  // Financial aggregates
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Caution Escrow & Rental Revenue
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Security deposit ledger, damage retention records, add-on sales & space receivables
        </p>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Caution in Escrow</span>
            <ShieldCheck size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(totalHeld, 'DZD')}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            Active deposits awaiting post-event inspection
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Released / Refunded</span>
            <CheckCircle2 size={18} className="text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(totalReleased, 'DZD')}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            Successfully returned after clean handover
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Retained for Damages</span>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(totalDeducted, 'DZD')}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            Property repair & equipment replacements
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Rental Bookings</span>
            <TrendingUp size={18} className="text-[var(--color-accent)]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white tabular-nums">
            {formatCurrencyAmount(totalBookingRevenue, 'DZD')}
          </div>
          <div className="text-xs text-neutral-400 mt-1">
            Includes {formatCurrencyAmount(totalAddonsRevenue, 'DZD')} equipment add-ons
          </div>
        </div>
      </div>

      {/* Caution Escrow Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Seek
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search caution deposits by renter or space..."
            openWidth={320}
            shutSize={40}
          />

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {(['All', 'Held', 'Released', 'Deducted'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === s
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                }`}
              >
                {s === 'All' ? 'All Caution Deposits' : s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800/60 rounded-3xl border border-[#E9EEF0] dark:border-neutral-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E9EEF0] dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-800/80 text-neutral-500 font-medium">
                  <th className="py-3 px-4">Renter & Unit</th>
                  <th className="py-3 px-4">Caution Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Collected Date</th>
                  <th className="py-3 px-4">Status & Notes</th>
                  <th className="py-3 px-4 text-right">Escrow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9EEF0] dark:divide-neutral-800">
                {filteredDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400">
                      No security deposit records found.
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
                          {dep.paymentMethod}
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
                          {dep.status}
                        </span>
                        {dep.deductionReason && (
                          <p className="text-[11px] text-red-500 mt-1 line-clamp-2">
                            {dep.deductionReason}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {dep.status === 'Held' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => releaseSecurityDeposit(dep.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition-colors"
                            >
                              Release Full
                            </button>
                            <button
                              onClick={() => handleOpenDeduct(dep)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 rounded-lg text-[11px] font-semibold transition-colors"
                            >
                              Deduct Damages
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-neutral-400 italic">
                            Settled ({dep.releasedAt ? dep.releasedAt.split('T')[0] : 'Done'})
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
                Retain Caution for Property Damage
              </h3>
              <button
                onClick={() => setDeductionTarget(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmDeduct} className="space-y-3 text-xs">
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                You are retaining part or all of the security deposit for <strong>{deductionTarget.renterName}</strong> ({deductionTarget.unitName}).
              </p>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Amount to Retain ({deductionTarget.currency})
                </label>
                <input
                  type="number"
                  max={deductionTarget.amount}
                  min={100}
                  value={deductionAmount}
                  onChange={(e) => setDeductionAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl tabular-nums font-mono"
                  required
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Original caution held: {formatCurrencyAmount(deductionTarget.amount, deductionTarget.currency)}
                </span>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Damage Report & Reason *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Scratched cyclorama floor paint requiring repaint, broken strobe bulb..."
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
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl"
                >
                  Confirm Deduction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
