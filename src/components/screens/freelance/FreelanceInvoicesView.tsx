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

export const FreelanceInvoicesView: React.FC = () => {
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
  const [notes, setNotes] = useState(
    'Payment due within 15 days via SEPA wire or BaridiMob. Reverse charge VAT applies.'
  );
  const [items, setItems] = useState<Array<{ description: string; quantity: number; unitRate: number }>>([
    { description: 'Sprint Deliverable & Engineering Milestones', quantity: 1, unitRate: 1500 },
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
              Invoices & Billing Hub
            </h1>
            <span className="text-xs text-neutral-500">
              Multi-currency ledger (EUR, USD, DZD) & 1-click unbilled settlements
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Issue compliant international and local invoices with instant printable PDF layouts
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="h-10 px-4 rounded-xl bg-[#C4785A] text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Create New Invoice</span>
        </button>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Total Billed Volume
          </span>
          <span className="text-2xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
            {freelanceInvoices.length} invoices
          </span>
          <p className="text-[11px] text-neutral-500 mt-0.5">Across active clients</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Collected (Paid)
          </span>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {freelanceInvoices.filter((i) => i.status === 'Paid').length} paid
          </span>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">Settled to bank</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Pending Payment
          </span>
          <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
            {freelanceInvoices.filter((i) => i.status === 'Sent').length} pending
          </span>
          <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80 mt-0.5">Awaiting wire clearing</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-neutral-900/40 border border-[#EDF1F3] dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
            Overdue Balance
          </span>
          <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
            {freelanceInvoices.filter((i) => i.status === 'Overdue').length} overdue
          </span>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-0.5">Payment reminders required</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by invoice #, client, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#C4785A]"
          />
        </div>

        {/* Segmented Filter Control */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl self-start sm:self-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Invoices' },
            { id: 'sent', label: 'Pending' },
            { id: 'paid', label: 'Paid' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'draft', label: 'Drafts' },
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
                <th className="pb-3 font-semibold">Invoice #</th>
                <th className="pb-3 font-semibold">Billed Client</th>
                <th className="pb-3 font-semibold">Issue / Due Date</th>
                <th className="pb-3 font-semibold text-right">Amount</th>
                <th className="pb-3 font-semibold text-center">Status</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
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
                      {inv.clientCompany || 'Direct Client'}
                    </span>
                  </td>
                  <td className="py-3.5 text-neutral-600 dark:text-neutral-400 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span>Issued: {inv.issueDate}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        Due: {inv.dueDate}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 text-right font-mono font-bold text-sm text-[#C4785A] tabular-nums">
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
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewInvoice(inv)}
                        className="h-7 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="View printable PDF invoice"
                      >
                        <Printer size={11} />
                        <span>View / Print</span>
                      </button>

                      {inv.status !== 'Paid' && (
                        <button
                          type="button"
                          onClick={() => updateInvoiceStatus(inv.id, 'Paid')}
                          className="h-7 px-2 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Mark invoice as paid"
                        >
                          <CheckCircle size={11} />
                          <span>Mark Paid</span>
                        </button>
                      )}

                      {inv.status === 'Draft' && (
                        <button
                          type="button"
                          onClick={() => updateInvoiceStatus(inv.id, 'Sent')}
                          className="h-7 px-2 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Dispatch invoice to client"
                        >
                          <Send size={11} />
                          <span>Send</span>
                        </button>
                      )}

                      {inv.status !== 'Paid' && (
                        <button
                          type="button"
                          onClick={() => setInvoiceToDelete(inv)}
                          className="h-7 w-7 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                          title="Void / Delete invoice"
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
              No Invoices Generated Yet
            </h4>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Draft professional multi-currency invoices manually or convert unbilled logged hours with one click.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} />
              <span>Create First Invoice</span>
            </button>
          </div>
        )}
      </div>

      {/* Manual Invoice Builder Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Create Client Invoice
              </h3>
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
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Client *
                  </label>
                  <select
                    value={targetClientId}
                    onChange={(e) => {
                      setTargetClientId(e.target.value);
                      const cl = freelanceClients.find((c) => c.id === e.target.value);
                      if (cl) setCurrency(cl.currency);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  >
                    {freelanceClients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.company || 'Private'}) · {c.currency}
                      </option>
                    ))}
                  </select>
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
                    <option value="DZD">DZD</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Payment Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Tax / VAT Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Line Items Builder */}
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-[#C4785A] hover:underline font-semibold cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Milestone or task description"
                        value={item.description}
                        onChange={(e) =>
                          handleItemChange(idx, 'description', e.target.value)
                        }
                        className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, 'quantity', Number(e.target.value))
                        }
                        className="w-16 px-2 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-right"
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder="Rate"
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
                  Payment Instructions & Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C4785A] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Generate Invoice
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
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Void / Delete Invoice</h3>
                <p className="text-xs text-neutral-500">Invoice #{invoiceToDelete.invoiceNumber}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Are you sure you want to delete invoice <strong className="text-neutral-900 dark:text-white font-semibold">#{invoiceToDelete.invoiceNumber}</strong> for <strong className="text-neutral-900 dark:text-white font-semibold">{invoiceToDelete.clientName}</strong>?
            </p>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold block mb-0.5">Time Log Reversal:</span>
              Any unbilled time logs associated with this invoice will automatically revert to unbilled so they can be re-itemized.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteFreelanceInvoice(invoiceToDelete.id);
                  setInvoiceToDelete(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                Delete Invoice
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
