import React, { useState } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  Building,
  Calendar,
  CreditCard,
  FileText,
  DollarSign,
} from 'lucide-react';
import { FreelanceInvoice } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { useAtriumStore } from '../../../services/store';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: FreelanceInvoice | null;
  onMarkPaid?: (id: string) => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onMarkPaid,
}) => {
  const { currentBusiness, currentUser, account } = useAtriumStore();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !invoice) return null;

  const businessName = currentBusiness?.name || 'Atlas Studio';
  const businessEmail = currentUser?.email || account?.email || 'contact@atlas-studio.dz';
  const businessAddress = currentBusiness?.address || 'Algiers, Algeria';
  const beneficiaryName =
    invoice.paymentDetails?.accountHolder ||
    currentUser?.fullName ||
    account?.fullName ||
    businessName;

  const handleCopyRib = () => {
    if (invoice.paymentDetails?.ribOrIban) {
      navigator.clipboard.writeText(invoice.paymentDetails.ribOrIban);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              Invoice #{invoice.invoiceNumber}
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                invoice.status === 'Paid'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : invoice.status === 'Overdue'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                  : invoice.status === 'Sent'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                  : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
              }`}
            >
              {invoice.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="h-8 px-3 rounded-full border border-neutral-200 dark:border-neutral-700 text-xs font-semibold flex items-center gap-1.5 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Printer size={13} />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Paper Container */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white dark:bg-[#18181B] text-neutral-900 dark:text-neutral-100 print:p-0">
          {/* Header Brand & Dates */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#C4785A] text-white flex items-center justify-center font-black text-sm shadow-xs">
                  {businessName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  {businessName}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Independent Digital Practice & Architecture
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {businessEmail} · {businessAddress}
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                Invoice Total
              </span>
              <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums block text-[#C4785A]">
                {formatCurrencyAmount(invoice.totalAmount, invoice.currency)}
              </span>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center sm:justify-end gap-2 pt-1">
                <span>Issued: {invoice.issueDate}</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Due: {invoice.dueDate}
                </span>
              </div>
            </div>
          </div>

          {/* Billed To Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#F8F9FA] dark:bg-neutral-900/40 p-4 rounded-2xl border border-[#EDF1F3] dark:border-neutral-800/80">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Billed To
              </span>
              <span className="text-sm font-bold text-neutral-900 dark:text-white block">
                {invoice.clientName}
              </span>
              {invoice.clientCompany && (
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 block">
                  {invoice.clientCompany}
                </span>
              )}
              <span className="text-xs text-neutral-500 dark:text-neutral-400 block mt-0.5">
                {invoice.clientEmail}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Payment Terms & Currency
              </span>
              <span className="text-xs text-neutral-700 dark:text-neutral-300 block">
                Net 15 Days · Settlement Currency: <strong className="text-neutral-900 dark:text-white">{invoice.currency}</strong>
              </span>
              {invoice.paidAt && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold block mt-1">
                  Settled on {new Date(invoice.paidAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
              Deliverables & Billable Services
            </span>
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-semibold">
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 text-right">Hours / Qty</th>
                    <th className="py-2.5 px-4 text-right">Rate</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-medium">
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                      <td className="py-3 px-4 text-neutral-900 dark:text-neutral-100">
                        {item.description}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-neutral-600 dark:text-neutral-400">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-neutral-600 dark:text-neutral-400">
                        {formatCurrencyAmount(item.unitRate, invoice.currency)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-neutral-900 dark:text-white">
                        {formatCurrencyAmount(item.total, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotal & Total Ledger */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-500">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-semibold text-neutral-800 dark:text-neutral-200">
                    {formatCurrencyAmount(invoice.subtotal, invoice.currency)}
                  </span>
                </div>
                {invoice.taxPercent > 0 && (
                  <div className="flex justify-between text-neutral-500">
                    <span>Tax ({invoice.taxPercent}%)</span>
                    <span className="tabular-nums font-semibold text-neutral-800 dark:text-neutral-200">
                      {formatCurrencyAmount(invoice.taxAmount, invoice.currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800 text-sm font-black text-neutral-900 dark:text-white">
                  <span>Total Due</span>
                  <span className="text-[#C4785A] tabular-nums">
                    {formatCurrencyAmount(invoice.totalAmount, invoice.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Coordinates / Payment Instructions */}
          {invoice.paymentDetails && (
            <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/60 border border-[#EDF1F3] dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                  <CreditCard size={14} className="text-[#C4785A]" />
                  Bank Wire & Settlement Instructions
                </span>
                <button
                  type="button"
                  onClick={handleCopyRib}
                  className="text-[11px] font-semibold text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy RIB / IBAN'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                <div>
                  <span className="text-[10px] uppercase text-neutral-400 block">Bank</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">{invoice.paymentDetails.bankName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-neutral-400 block">Beneficiary</span>
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">{beneficiaryName}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] uppercase text-neutral-400 block">RIB / IBAN</span>
                  <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white tabular-nums tracking-wide">
                    {invoice.paymentDetails.ribOrIban}
                  </span>
                </div>
              </div>
            </div>
          )}

          {invoice.notes && (
            <p className="text-[11px] text-neutral-400 italic">
              Note: {invoice.notes}
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-900/30">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Invoice #{invoice.invoiceNumber}
          </span>
          <div className="flex items-center gap-2">
            {invoice.status !== 'Paid' && onMarkPaid && (
              <button
                type="button"
                onClick={() => {
                  onMarkPaid(invoice.id);
                  onClose();
                }}
                className="h-9 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Mark as Settled / Paid
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-full border border-neutral-200 dark:border-neutral-700 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
