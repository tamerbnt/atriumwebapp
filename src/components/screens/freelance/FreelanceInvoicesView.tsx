import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Download,
  Sparkles,
  Home,
  ChevronDown,
  Building2,
  Check,
  Pin,
  Eye,
  Calendar,
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
import { AtriumButton } from '../../ui/AtriumButton';
import { UniversalDataCollection, ColumnDefinition } from '../../ui/collection';
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
    resetFreelanceMockData,
    businesses,
    branches,
    currentBusinessId,
    currentBranchId,
    switchBusiness,
    switchBranch,
    currentBusiness,
    currentUser,
    account,
    showToast,
  } = useAtriumStore();

  const currentBranch = branches.find((b) => b.id === currentBranchId);
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [pinnedInvoiceIds, setPinnedInvoiceIds] = useState<Set<string>>(new Set());
  const [invoiceSortBy, setInvoiceSortBy] = useState<string>('invoiceNumber');
  const [invoiceSortDir, setInvoiceSortDir] = useState<'asc' | 'desc'>('desc');

  // Auto-heal empty freelance invoices safely once on mount
  const hasAutoHealed = useRef(false);
  useEffect(() => {
    if (!hasAutoHealed.current && freelanceInvoices.length === 0) {
      hasAutoHealed.current = true;
      resetFreelanceMockData();
    }
  }, [freelanceInvoices.length, resetFreelanceMockData]);

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

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      const aPinned = pinnedInvoiceIds.has(a.id);
      const bPinned = pinnedInvoiceIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      if (invoiceSortBy === 'invoiceNumber') {
        const cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
        return invoiceSortDir === 'asc' ? cmp : -cmp;
      }
      if (invoiceSortBy === 'client') {
        const cmp = a.clientName.localeCompare(b.clientName);
        return invoiceSortDir === 'asc' ? cmp : -cmp;
      }
      if (invoiceSortBy === 'amount') {
        return invoiceSortDir === 'asc' ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount;
      }
      if (invoiceSortBy === 'status') {
        const cmp = a.status.localeCompare(b.status);
        return invoiceSortDir === 'asc' ? cmp : -cmp;
      }
      if (invoiceSortBy === 'date') {
        const cmp = a.issueDate.localeCompare(b.issueDate);
        return invoiceSortDir === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredInvoices, pinnedInvoiceIds, invoiceSortBy, invoiceSortDir]);

  const invoiceColumns: ColumnDefinition<FreelanceInvoice>[] = useMemo(() => [
    {
      key: 'invoiceNumber',
      header: t('free_inv_table_num', language) || 'Invoice #',
      width: '2.5*',
      minWidth: '220px',
      sortable: true,
      renderCell: (inv) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
            <FileText size={16} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-neutral-900 dark:text-white font-mono hover:text-[#C4785A] transition-colors">
              {inv.invoiceNumber}
            </div>
            <div className="text-[11px] text-neutral-400 truncate flex items-center gap-1.5">
              <span>{inv.clientName}</span>
              {inv.clientCompany && (
                <>
                  <span>·</span>
                  <span className="text-[#C4785A] font-medium">{inv.clientCompany}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'date',
      header: `${t('free_inv_table_date', language)} / ${t('free_inv_table_due', language)}`,
      width: '2*',
      minWidth: '160px',
      sortable: true,
      renderCell: (inv) => (
        <div className="text-[11px] text-neutral-600 dark:text-neutral-400 space-y-0.5">
          <div className="flex items-center gap-1">
            <span className="text-neutral-400">{t('free_inv_table_date', language)}:</span>
            <span>{inv.issueDate}</span>
          </div>
          <div className="flex items-center gap-1 font-semibold text-neutral-800 dark:text-neutral-200">
            <span className="text-neutral-400">{t('free_inv_table_due', language)}:</span>
            <span>{inv.dueDate}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: t('free_inv_table_amount', language),
      width: '1.8*',
      minWidth: '140px',
      sortable: true,
      renderCell: (inv) => (
        <span className="font-mono font-bold text-sm text-[#C4785A] tabular-nums">
          {formatCurrencyAmount(inv.totalAmount, inv.currency)}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('free_inv_table_status', language),
      width: '1.5*',
      minWidth: '120px',
      sortable: true,
      renderCell: (inv) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            inv.status === 'Paid'
              ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              : inv.status === 'Overdue'
              ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
              : inv.status === 'Sent'
              ? 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
              : 'text-neutral-600 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400'
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
      ),
    },
  ], [language, t]);

  const handleExportCSV = () => {
    if (freelanceInvoices.length === 0) return;
    const headers = [
      language === 'ar' ? 'رقم الفاتورة' : 'Invoice Number',
      language === 'ar' ? 'العميل' : 'Client',
      language === 'ar' ? 'الشركة' : 'Company',
      language === 'ar' ? 'تاريخ الإصدار' : 'Issue Date',
      language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date',
      language === 'ar' ? 'المجموع الفرعي' : 'Subtotal',
      language === 'ar' ? 'نسبة الضريبة' : 'Tax Percent',
      language === 'ar' ? 'المجموع الكلي' : 'Total Amount',
      language === 'ar' ? 'العملة' : 'Currency',
      language === 'ar' ? 'الحالة' : 'Status',
    ];

    const rows = sortedInvoices.map((inv) => [
      `"${inv.invoiceNumber}"`,
      `"${inv.clientName.replace(/"/g, '""')}"`,
      `"${(inv.clientCompany || '').replace(/"/g, '""')}"`,
      `"${inv.issueDate}"`,
      `"${inv.dueDate}"`,
      inv.subtotal,
      inv.taxPercent,
      inv.totalAmount,
      `"${inv.currency}"`,
      `"${inv.status}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `atrium_freelance_invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchMarkPaid = () => {
    if (selectedInvoiceIds.size === 0) return;
    selectedInvoiceIds.forEach((id) => {
      updateInvoiceStatus(id, 'Paid');
    });
    const count = selectedInvoiceIds.size;
    setSelectedInvoiceIds(new Set());
    showToast({
      type: 'success',
      title: language === 'ar' ? 'تم التحديث' : language === 'fr' ? 'Mis à jour' : 'Updated',
      message: `${count} ${language === 'ar' ? 'فواتير تم تعليمها كمدفوعة' : 'invoices marked as Paid'}`,
      category: 'freelance_solo',
    });
  };

  const handleBatchMarkSent = () => {
    if (selectedInvoiceIds.size === 0) return;
    selectedInvoiceIds.forEach((id) => {
      updateInvoiceStatus(id, 'Sent');
    });
    const count = selectedInvoiceIds.size;
    setSelectedInvoiceIds(new Set());
    showToast({
      type: 'info',
      title: language === 'ar' ? 'تم التحديث' : language === 'fr' ? 'Mis à jour' : 'Updated',
      message: `${count} ${language === 'ar' ? 'فواتير تم تعليمها كمرسلة' : 'invoices marked as Sent'}`,
      category: 'freelance_solo',
    });
  };

  const handleBatchDelete = () => {
    if (selectedInvoiceIds.size === 0) return;
    const count = selectedInvoiceIds.size;
    if (confirm(language === 'ar' ? `هل أنت متأكد من حذف ${count} فواتير؟` : `Delete ${count} selected invoices?`)) {
      selectedInvoiceIds.forEach((id) => {
        deleteFreelanceInvoice(id);
      });
      setSelectedInvoiceIds(new Set());
      showToast({
        type: 'info',
        title: language === 'ar' ? 'تم الحذف' : language === 'fr' ? 'Suppression' : 'Deleted',
        message: `${count} ${language === 'ar' ? 'فواتير تم حذفها' : 'invoices deleted'}`,
        category: 'freelance_solo',
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200">
            <FileText size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {t('free_inv_title', language)}
              </h1>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {freelanceInvoices.length} {t('free_inv_title', language).toLowerCase()}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {t('free_inv_subtitle', language)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* Facility Pill: Atrium 1 ▾ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-full bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Home size={15} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || 'Studio Main'}
              </span>
              <ChevronDown
                size={14}
                className={`text-neutral-500 transition-transform ${
                  isFacilityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Facility Dropdown Menu */}
            {isFacilityDropdownOpen && (
              <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {language === 'ar' ? 'الفروع والمراكز' : language === 'fr' ? 'Établissements & Espaces' : 'Facilities & Branches'}
                </div>
                {businesses.map((biz) => {
                  const isCurrent = biz.id === currentBusinessId;
                  const matchingBranch = branches.find((b) => b.businessId === biz.id);
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        switchBusiness(biz.id);
                        if (matchingBranch) switchBranch(matchingBranch.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left rtl:text-right flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                        <span className="truncate">{biz.name}</span>
                      </div>
                      {isCurrent && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Export CSV Button */}
          <AtriumButton
            type="button"
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportCSV}
            title="Export CSV"
          >
            <span className="hidden sm:inline">CSV</span>
          </AtriumButton>

          {/* Seed Demo Data Button */}
          <AtriumButton
            type="button"
            variant="outline"
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={resetFreelanceMockData}
            title={language === 'ar' ? 'إعادة شحن بيانات تجريبية' : language === 'fr' ? 'Recharger Données Démo' : 'Seed Mock Data'}
          >
            <span className="hidden sm:inline">{language === 'ar' ? 'بيانات تجريبية' : language === 'fr' ? 'Données Démo' : 'Demo Data'}</span>
          </AtriumButton>

          <AtriumButton
            type="button"
            variant="primary"
            size="sm"
            glow
            icon={<Plus size={14} />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            {t('free_inv_btn_new', language)}
          </AtriumButton>
        </div>
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

      {/* Batch Selection Toolbar */}
      {selectedInvoiceIds.size > 0 && (
        <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C4785A] animate-pulse" />
            <span className="text-xs font-bold text-neutral-900 dark:text-white">
              {selectedInvoiceIds.size} {language === 'ar' ? 'فواتير محددة' : language === 'fr' ? 'factures sélectionnées' : 'invoices selected'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedInvoiceIds(new Set())}
              className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white font-medium cursor-pointer"
            >
              {language === 'ar' ? 'إلغاء التحديد' : language === 'fr' ? 'Désélectionner' : 'Deselect'}
            </button>
            <button
              onClick={handleBatchMarkPaid}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <CheckCircle size={13} />
              <span>{language === 'ar' ? 'تعليم كمدفوعة' : language === 'fr' ? 'Marquer Payé' : 'Mark Paid'}</span>
            </button>
            <button
              onClick={handleBatchMarkSent}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Send size={13} />
              <span>{language === 'ar' ? 'تعليم كمرسلة' : language === 'fr' ? 'Marquer Envoyé' : 'Mark Sent'}</span>
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Trash2 size={13} />
              <span>{language === 'ar' ? 'حذف المحدد' : language === 'fr' ? 'Supprimer' : 'Delete'}</span>
            </button>
          </div>
        </div>
      )}

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

      {/* Universal Collection (List view & Grid view with 6-button corner-fan) */}
      <UniversalDataCollection<FreelanceInvoice>
        items={sortedInvoices}
        keyExtractor={(inv) => inv.id}
        defaultViewMode="list"
        columns={invoiceColumns}
        sortBy={invoiceSortBy}
        sortDirection={invoiceSortDir}
        onSortChange={(key) => {
          if (invoiceSortBy === key) {
            setInvoiceSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
          } else {
            setInvoiceSortBy(key);
            setInvoiceSortDir('asc');
          }
        }}
        renderCard={(inv) => (
          <div className="flex flex-col justify-between w-full h-full space-y-3">
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono font-bold text-neutral-900 dark:text-white text-sm">
                {inv.invoiceNumber}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                  inv.status === 'Paid'
                    ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200'
                    : inv.status === 'Overdue'
                    ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200'
                    : inv.status === 'Sent'
                    ? 'text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200'
                    : 'text-neutral-600 bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400'
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
            </div>

            <div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white leading-snug truncate">
                {inv.clientName}
              </h4>
              <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                {inv.clientCompany || t('free_inv_direct_client', language)}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 text-[11px] flex items-center gap-1">
                  <Calendar size={11} />
                  {t('free_inv_table_due', language)}: {inv.dueDate}
                </span>
                <span className="font-mono font-black text-sm text-[#C4785A] tabular-nums">
                  {formatCurrencyAmount(inv.totalAmount, inv.currency)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewInvoice(inv);
                  }}
                  className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Eye size={11} />
                  <span>{t('free_inv_doc_print', language)}</span>
                </button>

                {inv.status !== 'Paid' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateInvoiceStatus(inv.id, 'Paid');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <CheckCircle size={11} />
                    <span>{t('free_inv_doc_mark_paid_btn', language)}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        onItemClick={(inv) => setPreviewInvoice(inv)}
        onViewDetails={(inv) => setPreviewInvoice(inv)}
        onTogglePin={(inv) => {
          setPinnedInvoiceIds((prev) => {
            const next = new Set(prev);
            if (next.has(inv.id)) {
              next.delete(inv.id);
              showToast?.({
                type: 'info',
                title: 'Unpinned',
                message: `${inv.invoiceNumber} unpinned`,
              });
            } else {
              next.add(inv.id);
              showToast?.({
                type: 'info',
                title: 'Pinned',
                message: `${inv.invoiceNumber} pinned to top`,
              });
            }
            return next;
          });
        }}
        onDelete={(inv) => setInvoiceToDelete(inv)}
        customActions={(inv) => [
          {
            id: 'print',
            tooltip: t('free_inv_doc_print', language),
            icon: <Printer size={13} />,
            iconColor: '#C4785A',
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              setPreviewInvoice(inv);
            },
          },
        ]}
        isPinned={(inv) => pinnedInvoiceIds.has(inv.id)}
        selectedIds={selectedInvoiceIds}
        onSelectionChange={setSelectedInvoiceIds}
        emptyTitle={t('free_inv_empty_title', language)}
        emptyDescription={t('free_inv_empty_desc', language)}
        primaryActionLabel={t('free_inv_btn_new', language)}
        onAddFirstItem={() => setIsCreateModalOpen(true)}
      />

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
