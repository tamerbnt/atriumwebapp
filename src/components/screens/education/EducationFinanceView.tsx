import React, { useState } from 'react';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  Plus,
  Printer,
  X,
  FileText,
  Search,
  ChevronRight,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatMoney } from '../../../utils/rules';
import { EduEnrollment } from '../../../types';
import { Seek } from '../../ui/Seek';

type PaymentFilterKey = 'all' | 'pending' | 'partial' | 'overdue' | 'paid';

export const EducationFinanceView: React.FC = () => {
  const {
    eduEnrollments,
    eduCohorts,
    recordTuitionPayment,
    currentBusiness,
  } = useAtriumStore();

  const [filterKey, setFilterKey] = useState<PaymentFilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnrollmentForPayment, setSelectedEnrollmentForPayment] = useState<EduEnrollment | null>(null);
  const [selectedInstallmentIndex, setSelectedInstallmentIndex] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(15000);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [receiptToPrint, setReceiptToPrint] = useState<{
    studentName: string;
    cohortName: string;
    amount: number;
    method: string;
    date: string;
    receiptNumber: string;
  } | null>(null);

  // Financial aggregates
  const totalBilled = eduEnrollments.reduce((sum, e) => sum + (e.agreedTuition || 0), 0);
  const totalCollected = eduEnrollments.reduce((sum, e) => sum + (e.paidAmount || 0), 0);
  const totalOutstanding = totalBilled - totalCollected;
  const collectionVelocity = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  const overdueBalance = eduEnrollments
    .filter((e) => e.paymentStatus === 'Overdue')
    .reduce((sum, e) => sum + e.balanceDue, 0);

  const filteredEnrollments = eduEnrollments.filter((e) => {
    const matchesFilter = filterKey === 'all' || e.paymentStatus.toLowerCase() === filterKey.toLowerCase();
    if (!matchesFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.studentName.toLowerCase().includes(q) ||
        e.cohortName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenPayment = (enrollment: EduEnrollment, instIndex: number = 0) => {
    setSelectedEnrollmentForPayment(enrollment);
    setSelectedInstallmentIndex(instIndex);
    const inst = enrollment.installments?.[instIndex];
    setPaymentAmount(inst && !inst.isPaid ? inst.amount : enrollment.balanceDue);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnrollmentForPayment) return;

    recordTuitionPayment(
      selectedEnrollmentForPayment.id,
      selectedInstallmentIndex,
      paymentAmount,
      paymentMethod
    );

    setReceiptToPrint({
      studentName: selectedEnrollmentForPayment.studentName,
      cohortName: selectedEnrollmentForPayment.cohortName,
      amount: paymentAmount,
      method: paymentMethod,
      date: new Date().toISOString().split('T')[0],
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
    });

    setSelectedEnrollmentForPayment(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Row matching other category screens */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Tuition, Installments & Billing
            </h1>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {eduEnrollments.length} accounts · {formatMoney(totalCollected)} settled
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Multi-installment student tuition schedules, cash collection radar, overdue aging, and automated receipts
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="h-10 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer shadow-2xs"
          >
            <Printer size={14} />
            <span>Print Ledger</span>
          </button>
          {eduEnrollments.length > 0 && (
            <button
              type="button"
              onClick={() => handleOpenPayment(eduEnrollments[0], 0)}
              className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              <span>Record Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold mb-1">
            <span>Contracted Billed</span>
            <DollarSign size={16} className="text-[#C4785A]" />
          </div>
          <div className="my-1">
            <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums block">
              {formatMoney(totalBilled)}
            </span>
            <span className="text-xs text-neutral-500">across all active batches</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold mb-1">
            <span>Settled Collections</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="my-1">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums block">
              {formatMoney(totalCollected)}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              {collectionVelocity}% velocity collected
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold mb-1">
            <span>Outstanding Balance</span>
            <Wallet size={16} className="text-amber-500" />
          </div>
          <div className="my-1">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums block">
              {formatMoney(totalOutstanding)}
            </span>
            <span className="text-xs text-neutral-500">pending term collection</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-semibold mb-1">
            <span>Overdue Aging AR</span>
            <AlertCircle size={16} className="text-rose-500" />
          </div>
          <div className="my-1">
            <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums block">
              {formatMoney(overdueBalance)}
            </span>
            <span className="text-xs text-rose-500">requires immediate contact</span>
          </div>
        </div>
      </div>

      {/* Search & Segmented Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Seek
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search accounts by learner name or cohort..."
          openWidth={320}
          shutSize={40}
        />

        {/* Segmented Filter Control */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl self-start sm:self-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Accounts' },
            { id: 'pending', label: 'Pending' },
            { id: 'partial', label: 'Partial' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'paid', label: 'Fully Settled' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterKey(tab.id as PaymentFilterKey)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterKey === tab.id
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tuition Accounts Table */}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              <th className="py-3.5 px-4">Learner</th>
              <th className="py-3.5 px-4">Cohort</th>
              <th className="py-3.5 px-4">Agreed Tuition</th>
              <th className="py-3.5 px-4">Paid / Balance</th>
              <th className="py-3.5 px-4">Status & Milestones</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
            {filteredEnrollments.map((enr) => (
              <tr
                key={enr.id}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
              >
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
                      {enr.studentName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-white">
                        {enr.studentName}
                      </div>
                      <div className="text-[10px] text-neutral-400">ID: {enr.studentId}</div>
                    </div>
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 block truncate max-w-[180px]">
                    {enr.cohortName}
                  </span>
                </td>

                <td className="py-3.5 px-4 font-bold text-neutral-900 dark:text-white tabular-nums">
                  {formatMoney(enr.agreedTuition)}
                </td>

                <td className="py-3.5 px-4">
                  <div className="tabular-nums">
                    <span className="text-emerald-600 font-semibold">{formatMoney(enr.paidAmount)}</span>
                    <span className="text-neutral-400"> / </span>
                    <span className="text-rose-600 font-semibold">{formatMoney(enr.balanceDue)}</span>
                  </div>
                </td>

                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                        enr.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : enr.paymentStatus === 'Overdue'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}
                    >
                      {enr.paymentStatus}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {enr.installments?.filter((i) => i.isPaid).length || 0} /{' '}
                      {enr.installments?.length || 2} Paid
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-4 text-right">
                  {enr.balanceDue > 0 ? (
                    <button
                      type="button"
                      onClick={() => handleOpenPayment(enr, 0)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                    >
                      Record Payment
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      Completed
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {filteredEnrollments.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-neutral-400 italic">
                  No tuition records match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      {selectedEnrollmentForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Log Tuition Payment
              </h2>
              <button
                type="button"
                onClick={() => setSelectedEnrollmentForPayment(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-1">
                <div className="font-bold text-neutral-900 dark:text-white">
                  {selectedEnrollmentForPayment.studentName}
                </div>
                <div className="text-neutral-500">
                  Cohort: {selectedEnrollmentForPayment.cohortName}
                </div>
                <div className="text-[#C4785A] font-bold">
                  Outstanding Balance: {formatMoney(selectedEnrollmentForPayment.balanceDue)}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Payment Amount (DZD) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedEnrollmentForPayment.balanceDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-bold text-[#C4785A] focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
                >
                  <option value="Cash">Cash (Campus Bureau)</option>
                  <option value="Card / POS">Card (CIB / Dahabia POS)</option>
                  <option value="Bank Transfer">Bank / CCP Transfer</option>
                  <option value="Scholarship Voucher">Scholarship Voucher</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSelectedEnrollmentForPayment(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Confirm & Generate Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receiptToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="text-xs font-bold uppercase tracking-wider text-[#C4785A]">
                Official Tuition Receipt
              </div>
              <button
                type="button"
                onClick={() => setReceiptToPrint(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-center py-2 space-y-1">
              <div className="font-bold text-neutral-900 dark:text-white text-sm">
                {currentBusiness?.displayName || 'Atlas Academy'}
              </div>
              <div className="text-xs text-neutral-400">
                Receipt #{receiptToPrint.receiptNumber} · {receiptToPrint.date}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Learner:</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {receiptToPrint.studentName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Cohort / Course:</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {receiptToPrint.cohortName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Payment Channel:</span>
                <span className="font-semibold">{receiptToPrint.method}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800 font-bold text-sm">
                <span>Amount Paid:</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatMoney(receiptToPrint.amount)}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full h-10 text-xs font-semibold text-white bg-[#C4785A] hover:opacity-90 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer size={15} />
                <span>Print Official Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
