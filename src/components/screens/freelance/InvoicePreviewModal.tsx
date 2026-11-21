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
import { AtriumButton } from '../../ui/AtriumButton';
import { useTranslation } from '../../../utils/useTranslation';

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
  const { t, language, isRtl } = useTranslation();
  const { currentBusiness, currentUser, account } = useAtriumStore();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !invoice) return null;

  const businessName = currentBusiness?.name || (language === 'ar' ? 'أطلس ستوديو' : 'Atlas Studio');
  const businessEmail = currentUser?.email || account?.email || 'contact@atlas-studio.dz';
  const businessAddress = currentBusiness?.address || (language === 'ar' ? 'الجزائر العاصمة، الجزائر' : language === 'fr' ? 'Alger, Algérie' : 'Algiers, Algeria');
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
      <div className="bg-white dark:bg-[#262422] rounded-[var(--r-panel,28px)] max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden printable-document">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--atr-divider)] no-print">
          <div className="flex items-center gap-2">
            <span className="t-label font-semibold text-black dark:text-white">
              {t('free_inv_doc_invoice', language)} #{invoice.invoiceNumber}
            </span>
            <span
              className={`t-small font-semibold px-2 py-1 rounded-full ${
                invoice.status === 'Paid'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60'
                  : invoice.status === 'Overdue'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60'
                  : invoice.status === 'Sent'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60'
                  : 'bg-[#EFE9E2] text-black/75 dark:bg-[#2B2825] dark:text-white/75'
              }`}
            >
              {invoice.status === 'Paid'
                ? t('free_invoice_status_paid', language)
                : invoice.status === 'Overdue'
                ? t('free_invoice_status_overdue', language)
                : invoice.status === 'Sent'
                ? t('free_invoice_status_sent', language)
                : t('free_invoice_status_draft', language)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <AtriumButton
              variant="outline"
              size="sm"
              icon={<Printer size={13} />}
              onClick={handlePrint}
            >
              <span>{t('free_inv_doc_print', language)}</span>
            </AtriumButton>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black dark:hover:text-white hover:bg-[#EFE9E2] dark:hover:bg-[#2B2825] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Paper Container */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white text-black print:p-0">
          {/* Header Brand & Dates */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-black/[0.08]">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[var(--r-ctl-sm,10px)] bg-[var(--brand-fill,#C9461F)] text-white flex items-center justify-center font-semibold t-label shadow-xs">
                  {businessName.charAt(0).toUpperCase()}
                </div>
                <span className="t-dialog font-semibold text-black">
                  {businessName}
                </span>
              </div>
              <p className="t-cap text-black/55 mt-1">
                {t('free_clients_crm_title', language)}
              </p>
              <p className="t-cap text-black/55 mt-0.5">
                {businessEmail} · {businessAddress}
              </p>
            </div>

            <div className={`space-y-1 ${isRtl ? 'sm:text-left text-right' : 'sm:text-right text-left'}`}>
              <span className="t-small font-semibold text-black/55 block">
                {t('free_invoice_total', language)}
              </span>
              <span className="t-kpi-m uppercase text-black tabular-nums block text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]">
                {formatCurrencyAmount(invoice.totalAmount, invoice.currency)}
              </span>
              <div className={`t-cap text-black/55 flex items-center gap-2 pt-1 ${isRtl ? 'sm:justify-start' : 'sm:justify-end'}`}>
                <span>{t('free_inv_table_date', language)}: {invoice.issueDate}</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-black">
                  {t('free_inv_table_due', language)}: {invoice.dueDate}
                </span>
              </div>
            </div>
          </div>

          {/* Billed To Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#F3EDE7] p-4 rounded-[var(--r-card,16px)] border border-black/[0.06]">
            <div>
              <span className="t-small font-semibold text-black/55 block mb-1">
                {t('free_inv_doc_bill_to', language)}
              </span>
              <span className="t-label font-semibold text-black block">
                {invoice.clientName}
              </span>
              {invoice.clientCompany && (
                <span className="t-small font-medium text-black/75 block">
                  {invoice.clientCompany}
                </span>
              )}
              <span className="t-cap text-black/55 block mt-0.5">
                {invoice.clientEmail}
              </span>
            </div>

            <div>
              <span className="t-small font-semibold text-black/55 block mb-1">
                {t('free_inv_notes_terms', language)}
              </span>
              <span className="t-cap text-black/75 block">
                {t('free_inv_net_prefix', language)} · <strong className="text-black">{invoice.currency}</strong>
              </span>
              {invoice.paidAt && (
                <span className="t-small text-emerald-600 font-semibold block mt-1">
                  ✓ {t('free_inv_doc_paid_badge', language)} ({new Date(invoice.paidAt).toLocaleDateString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-US')})
                </span>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <span className="t-small font-semibold text-black/55 block">
              {t('free_deliv_title', language)}
            </span>
            <div className="border border-black/[0.08] rounded-[var(--r-card,16px)] overflow-hidden">
              <table className="w-full border-collapse t-cap">
                <thead>
                  <tr className="bg-neutral-50 border-b border-black/[0.08] text-black/55 font-semibold">
                    <th className={`py-2 px-4 ${isRtl ? 'text-right' : 'text-left'}`}>{t('free_inv_item_desc', language)}</th>
                    <th className={`py-2 px-4 ${isRtl ? 'text-left' : 'text-right'}`}>{t('free_inv_item_qty', language)}</th>
                    <th className={`py-2 px-4 ${isRtl ? 'text-left' : 'text-right'}`}>{t('free_inv_item_rate', language)}</th>
                    <th className={`py-2 px-4 ${isRtl ? 'text-left' : 'text-right'}`}>{t('free_inv_item_total', language)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06] font-medium">
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/50">
                      <td className={`py-3 px-4 text-black ${isRtl ? 'text-right' : 'text-left'}`}>
                        {item.description}
                      </td>
                      <td className={`py-3 px-4 tabular-nums text-black/75 ${isRtl ? 'text-left' : 'text-right'}`}>
                        {item.quantity}
                      </td>
                      <td className={`py-3 px-4 tabular-nums text-black/75 ${isRtl ? 'text-left' : 'text-right'}`}>
                        {formatCurrencyAmount(item.unitRate, invoice.currency)}
                      </td>
                      <td className={`py-3 px-4 tabular-nums font-semibold text-black ${isRtl ? 'text-left' : 'text-right'}`}>
                        {formatCurrencyAmount(item.total, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subtotal & Total Ledger */}
            <div className={`flex ${isRtl ? 'justify-start' : 'justify-end'} pt-2`}>
              <div className="w-64 space-y-2 t-cap">
                <div className="flex justify-between text-black/55">
                  <span>{t('free_inv_doc_subtotal', language)}</span>
                  <span className="tabular-nums font-semibold text-black">
                    {formatCurrencyAmount(invoice.subtotal, invoice.currency)}
                  </span>
                </div>
                {invoice.taxPercent > 0 && (
                  <div className="flex justify-between text-black/55">
                    <span>{t('free_inv_doc_tax', language)} ({invoice.taxPercent}%)</span>
                    <span className="tabular-nums font-semibold text-black">
                      {formatCurrencyAmount(invoice.taxAmount, invoice.currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-black/[0.08] t-label font-semibold text-black">
                  <span>{t('free_inv_doc_grand_total', language)}</span>
                  <span className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] tabular-nums">
                    {formatCurrencyAmount(invoice.totalAmount, invoice.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Coordinates / Payment Instructions */}
          {invoice.paymentDetails && (
            <div className="p-4 rounded-[var(--r-card,16px)] bg-[#F3EDE7] border border-black/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <span className="t-small font-semibold text-black flex items-center gap-2">
                  <CreditCard size={14} className="text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)]" />
                  {t('free_inv_doc_rib_label', language)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRib}
                  className="t-small font-semibold text-[var(--brand-text,#BF431F)] dark:text-[var(--brand-on-dark,#FF8F63)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? t('free_inv_doc_rib_copied', language) : t('free_inv_doc_copy_rib', language)}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 t-cap text-black/75">
                <div>
                  <span className="t-cap text-black/55 block">{t('free_inv_doc_bank', language)}</span>
                  <span className="font-semibold text-black">{invoice.paymentDetails.bankName}</span>
                </div>
                <div>
                  <span className="t-cap text-black/55 block">{t('free_inv_doc_account_holder', language)}</span>
                  <span className="font-semibold text-black">{beneficiaryName}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="t-cap text-black/55 block">{t('free_inv_doc_rib_iban', language)}</span>
                  <span className="tabular-nums t-small font-semibold text-black tracking-wide">
                    {invoice.paymentDetails.ribOrIban}
                  </span>
                </div>
              </div>
            </div>
          )}

          {invoice.notes && (
            <p className="t-cap text-black/55 italic">
              {invoice.notes}
            </p>
          )}

          <div className="text-center pt-4 border-t border-dashed border-black/[0.14]">
            <p className="t-small font-semibold text-black/55">
              {t('free_inv_doc_thank_you', language)}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[var(--atr-divider)] flex items-center justify-between bg-[#F5F1EC]/60 dark:bg-[#1D1B19] no-print">
          <span className="t-cap text-black/55 dark:text-white/55">
            {t('free_inv_doc_invoice', language)} #{invoice.invoiceNumber}
          </span>
          <div className="flex items-center gap-2">
            {invoice.status !== 'Paid' && onMarkPaid && (
              <AtriumButton
                variant="primary"
                size="sm"
                glow
                className="bg-emerald-600 hover:bg-emerald-700 shadow-[0_2px_8px_rgba(16,185,129,0.28)] hover:shadow-[0_4px_16px_rgba(16,185,129,0.40)]"
                onClick={() => {
                  onMarkPaid(invoice.id);
                  onClose();
                }}
              >
                {t('free_inv_doc_mark_paid_btn', language)}
              </AtriumButton>
            )}
            <AtriumButton
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              {t('free_clients_cancel', language)}
            </AtriumButton>
          </div>
        </div>
      </div>
    </div>
  );
};
