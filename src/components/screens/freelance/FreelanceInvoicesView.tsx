import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Printer,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  DollarSign,
  ChevronRight,
  Filter,
  X,
  CreditCard,
  Building,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatCurrencyAmount } from '../../../utils/rules';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import {
  FreelanceInvoice,
  FreelanceInvoiceItem,
  InvoiceStatus,
  CurrencyCode,
} from '../../../types/index';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { useTranslation } from '../../../utils/useTranslation';

export const FreelanceInvoicesView: React.FC = () => {
  const { t, language, isRtl } = useTranslation();
  const {
    freelanceInvoices,
    freelanceClients,
    timeLogs,
    createFreelanceInvoice,
    updateInvoiceStatus,
    deleteFreelanceInvoice,
    billUnbilledHours,
    currentBusiness,
    currentUser,
    account,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [previewInvoice, setPreviewInvoice] = useState<FreelanceInvoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<FreelanceInvoice | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Invoice Form
  const [targetClientId, setTargetClientId] = useState<string>(
    freelanceClients[0]?.id || ''
  );
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [notes, setNotes] = useState(() => t('free_inv_default_terms', language));
  const [items, setItems] = useState<Array<{ description: string; quantity: number; unitRate: number }>>(() => [
    { description: t('free_inv_default_item_desc', language), quantity: 1, unitRate: 1500 },
  ]);

  const filteredInvoices = useMemo(() => {
    return freelanceInvoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.clientCompany && inv.clientCompany.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus =
        selectedStatus === 'all' ? true : inv.status.toLowerCase() === selectedStatus.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [freelanceInvoices, searchQuery, selectedStatus]);

  // Aggregate invoice metrics
  const totalBilled = freelanceInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = freelanceInvoices
    .filter((inv) => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPending = freelanceInvoices
    .filter((inv) => inv.status === 'Sent')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalOverdue = freelanceInvoices
    .filter((inv) => inv.status === 'Overdue')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const handleAddItemRow = () => {
    setItems([...items, { description: '', quantity: 1, unitRate: 100 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const client = freelanceClients.find((c) => c.id === targetClientId);
    if (!client) return;

    const formattedItems: FreelanceInvoiceItem[] = items.map((item, idx) => ({
      id: `item_${Date.now()}_${idx}`,
      description: item.description,
      quantity: Number(item.quantity),
      unitRate: Number(item.unitRate),
      total: Number(item.quantity) * Number(item.unitRate),
    }));

    const subtotal = formattedItems.reduce((acc, it) => acc + it.total, 0);
    const taxAmt = (subtotal * Number(taxPercent)) / 100;
    const totalAmt = subtotal + taxAmt;

    const created = createFreelanceInvoice({
      clientId: client.id,
      clientName: client.name,
      clientCompany: client.company,
      clientEmail: client.email,
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(freelanceInvoices.length + 1).padStart(3, '0')}`,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate,
      status: 'Sent',
      currency,
      taxPercent: Number(taxPercent),
      subtotal,
      taxAmount: taxAmt,
      totalAmount: totalAmt,
      notes,
      items: formattedItems,
      paymentDetails: {
        bankName:
          currency === 'DZD'
            ? 'Algérie Poste / BaridiMob & BEA'
            : 'Banque Extérieure d\'Algérie (BEA) / Euro Wire',
        accountHolder: currentUser?.fullName || account?.fullName || currentBusiness?.name || 'Amine Bentouati',
        ribOrIban:
          currency === 'DZD'
            ? '007 99999 0001234567 89'
            : 'DZ98 0020 0012 3456 7890 1234',
        swift: 'BEXADZAL',
      },
    });

    setIsCreateModalOpen(false);
    setPreviewInvoice(created);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {t('free_inv_title', language)}
            </h1>
            <span className="text-xs text-neutral-500">
              {freelanceInvoices.length} {t('free_inv_title', language).toLowerCase()}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            {t('free_inv_subtitle', language)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>{t('free_inv_btn_new', language)}</span>
        </button>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('free_kpi_invoiced_ytd', language)}
          </span>
          <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
            {freelanceInvoices.length}
          </span>
          <p className="text-[11px] text-neutral-500 mt-0.5">{t('free_kpi_active_clients', language)}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('free_inv_filter_paid', language)}
          </span>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {freelanceInvoices.filter((i) => i.status === 'Paid').length}
          </span>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">{t('free_inv_doc_paid_badge', language)}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('free_inv_filter_sent', language)}
          </span>
          <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
            {freelanceInvoices.filter((i) => i.status === 'Sent').length}
          </span>
          <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80 mt-0.5">{t('free_invoice_status_sent', language)}</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            {t('free_inv_filter_overdue', language)}
          </span>
          <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
            {freelanceInvoices.filter((i) => i.status === 'Overdue').length}
          </span>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-0.5">{t('free_inv_doc_overdue_badge', language)}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Seek
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('free_search_clients_ph', language)}
          openWidth={300}
          shutSize={40}
        />

        {/* Segmented Filter Control */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl self-start sm:self-auto overflow-x-auto">
          {[
            { id: 'all', label: t('free_inv_filter_all', language) },
            { id: 'sent', label: t('free_inv_filter_sent', language) },
            { id: 'paid', label: t('free_inv_filter_paid', language) },
            { id: 'overdue', label: t('free_inv_filter_overdue', language) },
            { id: 'draft', label: t('free_inv_filter_draft', language) },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedStatus === tab.id
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Data Grid Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className={`pb-3 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{t('free_inv_table_num', language)}</th>
                <th className={`pb-3 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{t('free_inv_table_client', language)}</th>
                <th className={`pb-3 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{t('free_inv_table_date', language)} / {t('free_inv_table_due', language)}</th>
                <th className={`pb-3 font-semibold ${isRtl ? 'text-left' : 'text-right'}`}>{t('free_inv_table_amount', language)}</th>
                <th className="pb-3 font-semibold text-center">{t('free_inv_table_status', language)}</th>
                <th className={`pb-3 font-semibold ${isRtl ? 'text-left' : 'text-right'}`}>{t('free_inv_table_actions', language)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {filteredInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                >
                  <td className="py-3.5 font-bold text-neutral-900 dark:text-white font-mono">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3.5">
                    <span className="font-bold text-neutral-900 dark:text-white block">
                      {inv.clientName}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {inv.clientCompany || t('free_inv_direct_client', language)}
                    </span>
                  </td>
                  <td className="py-3.5 text-neutral-600 dark:text-neutral-400 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span>{t('free_inv_table_date', language)}: {inv.issueDate}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {t('free_inv_table_due', language)}: {inv.dueDate}
                      </span>
                    </div>
                  </td>
                  <td className={`py-3.5 font-mono font-bold text-sm text-[#C4785A] tabular-nums ${isRtl ? 'text-left' : 'text-right'}`}>
                    {formatCurrencyAmount(inv.totalAmount, inv.currency)}
                  </td>
                  <td className="py-3.5 text-center">
                    <span
                      className={`text-[11px] font-semibold ${
                        inv.status === 'Paid'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : inv.status === 'Overdue'
                          ? 'text-rose-600 dark:text-rose-400 font-bold'
                          : inv.status === 'Sent'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-neutral-500'
                      }`}
                    >
                      {inv.status === 'Paid'
                        ? t('free_invoice_status_paid', language)
                        : inv.status === 'Overdue'
                        ? t('free_invoice_status_overdue', language)
                        : inv.status === 'Sent'
                        ? t('free_invoice_status_sent', language)
                        : t('free_invoice_status_draft', language)}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewInvoice(inv)}
                        className="h-7 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title={t('free_inv_doc_print', language)}
                      >
                        <Printer size={11} />
                        <span>{t('free_inv_doc_print', language)}</span>
                      </button>

                      {inv.status !== 'Paid' && (
                        <button
                          type="button"
                          onClick={() => updateInvoiceStatus(inv.id, 'Paid')}
                          className="h-7 px-2 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title={t('free_inv_doc_mark_paid_btn', language)}
                        >
                          <CheckCircle size={11} />
                          <span>{t('free_inv_doc_mark_paid_btn', language)}</span>
                        </button>
                      )}

                      {inv.status === 'Draft' && (
                        <button
                          type="button"
                          onClick={() => updateInvoiceStatus(inv.id, 'Sent')}
                          className="h-7 px-2 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title={t('free_invoice_status_sent', language)}
                        >
                          <Send size={11} />
                          <span>{t('free_invoice_status_sent', language)}</span>
                        </button>
                      )}

                      {inv.status !== 'Paid' && (
                        <button
                          type="button"
                          onClick={() => setInvoiceToDelete(inv)}
                          className="h-7 w-7 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                          title={t('common_delete', language)}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="py-12 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 p-8 space-y-3">
            <FileText size={32} className="mx-auto text-neutral-300 dark:text-neutral-600" />
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
              {t('free_inv_empty_title', language)}
            </h4>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {t('free_inv_empty_desc', language)}
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} />
              <span>{t('free_inv_btn_new', language)}</span>
            </button>
          </div>
        )}
      </div>

      {/* Manual Invoice Builder Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {t('free_inv_modal_new_title', language)}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {t('free_inv_modal_new_desc', language)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <LabelSelect
                    field="TargetClient"
                    label={`${t('free_invoice_client', language)} *`}
                    placeholder={t('free_inv_ph_select_client', language)}
                    value={targetClientId}
                    onChange={(val) => {
                      const clientId = val?.target?.value ?? String(val);
                      setTargetClientId(clientId);
                      const cl = freelanceClients.find((c) => c.id === clientId);
                      if (cl) setCurrency(cl.currency);
                    }}
                    options={freelanceClients.map((c) => ({
                      value: c.id,
                      label: c.name,
                      sublabel: `${c.company || t('free_clients_private_badge', language)} · ${c.currency}`,
                    }))}
                    searchable
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
                <div>
                  <LabelSelect
                    field="InvoiceCurrency"
                    label={t('free_clients_currency', language)}
                    value={currency}
                    onChange={(val) => setCurrency((val?.target?.value ?? String(val)) as CurrencyCode)}
                    options={['DZD', 'EUR', 'USD']}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabelInput
                  field="DueDate"
                  label={`${t('free_invoice_due', language)} *`}
                  type="date"
                  required
                  value={dueDate}
                  onChange={setDueDate}
                  width="100%"
                  height={40}
                  corner={12}
                />
                <LabelInput
                  field="TaxPercent"
                  label={t('free_inv_doc_tax', language)}
                  type="number"
                  min={0}
                  max={100}
                  value={taxPercent}
                  onChange={(val) => setTaxPercent(Number(val?.target?.value ?? val))}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>

              {/* Line Items Builder */}
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {t('free_deliv_title', language)}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-[#C4785A] hover:underline font-semibold cursor-pointer"
                  >
                    + {t('free_inv_btn_add_line', language)}
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder={t('free_inv_item_desc', language)}
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(idx, 'description', e.target.value)
                        }
                        className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder={t('free_inv_ph_qty', language)}
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, 'quantity', Number(e.target.value))
                        }
                        className="w-16 px-2 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-right"
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder={t('free_inv_ph_rate', language)}
                        value={item.unitRate}
                        onChange={(e) =>
                          handleItemChange(idx, 'unitRate', Number(e.target.value))
                        }
                        className="w-24 px-2 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-right"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 text-neutral-400 hover:text-rose-500 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  {t('free_inv_notes_terms', language)}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('free_inv_notes_ph', language)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  {t('free_clients_cancel', language)}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('free_inv_btn_new', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Void Invoice Confirmation Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">{t('common_delete', language)}</h3>
                <p className="text-xs text-neutral-500">#{invoiceToDelete.invoiceNumber}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {t('free_clients_delete_confirm', language)} <strong className="text-neutral-900 dark:text-white font-semibold">#{invoiceToDelete.invoiceNumber}</strong> ({invoiceToDelete.clientName})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                {t('free_clients_cancel', language)}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteFreelanceInvoice(invoiceToDelete.id);
                  setInvoiceToDelete(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                {t('common_delete', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview & Print Modal */}
      <InvoicePreviewModal
        isOpen={Boolean(previewInvoice)}
        onClose={() => setPreviewInvoice(null)}
        invoice={previewInvoice}
        onMarkPaid={(id) => {
          updateInvoiceStatus(id, 'Paid');
          if (previewInvoice) {
            setPreviewInvoice({ ...previewInvoice, status: 'Paid' });
          }
        }}
      />
    </div>
  );
};
