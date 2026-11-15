import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  FileText,
  Plus,
  Printer,
  CheckCircle,
  Clock,
  Send,
  X,
  Trash2,
  AlertTriangle,
  Eye,
  Calendar,
} from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { formatCurrencyAmount } from '../../../utils/rules';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { FreelanceInvoice, CurrencyCode } from '../../../types/index';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';
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
  buildBranchesByIdMap,
  resolveRecordBranch,
  downloadCsvSafe,
} from '../../ui/kinetic';

const extractStr = (val: any): string =>
  typeof val === 'string' ? val : val?.target?.value ?? String(val ?? '');

export const FreelanceInvoicesView: React.FC = () => {
  const { t, language } = useTranslation();
  const isAr = language === 'ar';
  const isFr = language === 'fr';

  const {
    freelanceInvoices,
    freelanceClients,
    timeLogs,
    createFreelanceInvoice,
    updateInvoiceStatus,
    deleteFreelanceInvoice,
    billUnbilledHours,
    branches,
    currentBranch,
    currentBusiness,
    currentUser,
    account,
    isSyncing,
    networkMode,
    retryCloudSync,
    lastSyncedAt,
    isSyncTimeout,
  } = useAtriumStore();

  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(() => new Set<string>());
  const [pinnedInvoiceIds, setPinnedInvoiceIds] = useState<Set<string>>(() => new Set<string>());
  const [invoiceSortBy, setInvoiceSortBy] = useState<string>('invoiceNumber');
  const [invoiceSortDir, setInvoiceSortDir] = useState<'asc' | 'desc'>('desc');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [currencyFilter, setCurrencyFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedInvoice, setSelectedInvoice] = useState<FreelanceInvoice | null>(null);
  const [drawerOpenerEl, setDrawerOpenerEl] = useState<HTMLElement | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<FreelanceInvoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<FreelanceInvoice | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [targetClientId, setTargetClientId] = useState(freelanceClients[0]?.id || '');
  const [currency, setCurrency] = useState<CurrencyCode>('EUR');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 1296000000).toISOString().split('T')[0]
  );
  const [taxPercent, setTaxPercent] = useState(0);
  const [notes, setNotes] = useState(() => t('free_inv_default_terms', language));
  const [items, setItems] = useState(() => [
    {
      description: t('free_inv_default_item_desc', language),
      quantity: 1,
      unitRate: 1500,
    },
  ]);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const branchCounts = useMemo(() => {
    const map = new Map<string, number>();
    freelanceInvoices.forEach((inv) => {
      const bName = resolveRecordBranch(inv, branchesById, currentBranch, language).name;
      map.set(bName, (map.get(bName) || 0) + 1);
    });
    return map;
  }, [freelanceInvoices, branchesById, currentBranch, language]);

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return freelanceInvoices.filter((inv) => {
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(inv, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (currencyFilter !== 'All' && inv.currency !== currencyFilter) return false;
      if (selectedStatus !== 'all' && inv.status.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false;
      }
      if (q) {
        const matchesSearch =
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.clientName.toLowerCase().includes(q) ||
          (inv.clientCompany && inv.clientCompany.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [
    freelanceInvoices,
    branchFilter,
    currencyFilter,
    selectedStatus,
    searchQuery,
    branchesById,
    currentBranch,
    language,
  ]);

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
      if (invoiceSortBy === 'branch') {
        const cmp = resolveRecordBranch(a, branchesById, currentBranch, language).name.localeCompare(
          resolveRecordBranch(b, branchesById, currentBranch, language).name
        );
        return invoiceSortDir === 'asc' ? cmp : -cmp;
      }
      if (invoiceSortBy === 'amount') {
        return invoiceSortDir === 'asc'
          ? a.totalAmount - b.totalAmount
          : b.totalAmount - a.totalAmount;
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
  }, [
    filteredInvoices,
    pinnedInvoiceIds,
    invoiceSortBy,
    invoiceSortDir,
    branchesById,
    currentBranch,
    language,
  ]);

  const activeInspectorInvoice = useMemo(() => {
    if (!selectedInvoice) return null;
    return freelanceInvoices.find((i) => i.id === selectedInvoice.id) || selectedInvoice;
  }, [selectedInvoice, freelanceInvoices]);

  const handleAddItemRow = () => {
    setItems([...items, { description: '', quantity: 1, unitRate: 100 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: 'description' | 'quantity' | 'unitRate',
    value: any
  ) => {
    const updated: any[] = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const client = freelanceClients.find((c) => c.id === targetClientId);
    if (!client) return;
    const formattedItems = items.map((item, idx) => ({
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
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(freelanceInvoices.length + 1).padStart(
        3,
        '0'
      )}`,
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
            : "Banque Extérieure d'Algérie (BEA) / Euro Wire",
        accountHolder:
          currentUser?.fullName || account?.fullName || currentBusiness?.name || 'Amine Bentouati',
        ribOrIban:
          currency === 'DZD' ? '007 99999 0001234567 89' : 'DZ98 0020 0012 3456 7890 1234',
        swift: 'BEXADZAL',
      },
    });
    setIsCreateModalOpen(false);
    setPreviewInvoice(created);
  };

  const handleBillAllUnbilled = useCallback(() => {
    const clientsWithUnbilled = freelanceClients.filter((c) =>
      timeLogs.some((tl) => tl.clientId === c.id && tl.isBillable && !tl.isInvoiced)
    );
    if (clientsWithUnbilled.length > 0) {
      clientsWithUnbilled.forEach((c) => {
        try {
          billUnbilledHours(c.id);
        } catch (err) {
          console.error(err);
        }
      });
      showToast({
        type: 'success',
        title: isAr ? 'فوترة الساعات' : 'Bill Hours',
        message: isAr
          ? 'تم تحويل الساعات غير المفوترة إلى مسودات'
          : 'Unbilled hours drafted into invoices',
        category: 'freelance_solo',
      });
    } else {
      showToast({
        type: 'info',
        title: isAr ? 'لا توجد ساعات' : 'No Unbilled Hours',
        message: isAr
          ? 'لا توجد ساعات غير مفوترة حالياً'
          : 'All billable hours are already invoiced',
        category: 'freelance_solo',
      });
    }
  }, [freelanceClients, timeLogs, billUnbilledHours, isAr]);

  const invoiceColumns: ColumnDefinition<FreelanceInvoice>[] = useMemo(
    () => [
      {
        key: 'invoiceNumber',
        header: t('free_inv_table_num', language) || 'Invoice #',
        width: '2.3*',
        minWidth: '200px',
        sortable: true,
        renderCell: (inv) => (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white flex items-center justify-center font-bold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
              <FileText size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-black dark:text-white font-mono hover:text-[#d4522f] transition-colors">
                {inv.invoiceNumber}
              </div>
              <div className="text-[11px] text-black/55 dark:text-white/55 truncate flex items-center gap-1.5">
                <span>{inv.clientName}</span>
                {inv.clientCompany && (
                  <>
                    <span>·</span>
                    <span className="text-[#d4522f] font-medium">{inv.clientCompany}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'branch',
        header: isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
        width: '1.3*',
        minWidth: '120px',
        sortable: true,
        renderCell: (inv) => {
          const bInfo = resolveRecordBranch(inv, branchesById, currentBranch, language);
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F3EDE7] dark:bg-neutral-800 text-black dark:text-white border border-[#E6DED6] dark:border-neutral-700 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4522f] shrink-0" />
              {bInfo.name}
            </span>
          );
        },
      },
      {
        key: 'date',
        header: `${t('free_inv_table_date', language)} / ${t('free_inv_table_due', language)}`,
        width: '1.8*',
        minWidth: '150px',
        sortable: true,
        renderCell: (inv) => (
          <div className="text-[11px] text-black/70 dark:text-white/75 space-y-0.5">
            <div className="flex items-center gap-1">
              <span className="text-black/55 dark:text-white/55">
                {t('free_inv_table_date', language)}:
              </span>
              <span>{inv.issueDate}</span>
            </div>
            <div className="flex items-center gap-1 font-semibold text-black dark:text-white">
              <span className="text-black/55 dark:text-white/55">
                {t('free_inv_table_due', language)}:
              </span>
              <span>{inv.dueDate}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'amount',
        header: t('free_inv_table_amount', language),
        width: '1.6*',
        minWidth: '130px',
        sortable: true,
        renderCell: (inv) => (
          <span className="font-mono font-bold text-sm text-[#d4522f] tabular-nums">
            {formatCurrencyAmount(inv.totalAmount, inv.currency)}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('free_inv_table_status', language),
        width: '1.4*',
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
                : 'text-black/70 bg-neutral-100 dark:bg-neutral-800 dark:text-white/75'
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
    ],
    [language, t, branchesById, currentBranch, isAr, isFr]
  );

  const handleExportCSV = useCallback(() => {
    if (sortedInvoices.length === 0) return;
    const headers = [
      isAr ? 'رقم الفاتورة' : 'Invoice Number',
      isAr ? 'العميل' : 'Client',
      isAr ? 'الشركة' : 'Company',
      isAr ? 'الفرع' : isFr ? 'Branche' : 'Branch',
      isAr ? 'تاريخ الإصدار' : 'Issue Date',
      isAr ? 'تاريخ الاستحقاق' : 'Due Date',
      isAr ? 'المجموع الفرعي' : 'Subtotal',
      isAr ? 'نسبة الضريبة' : 'Tax Percent',
      isAr ? 'المجموع الكلي' : 'Total Amount',
      isAr ? 'العملة' : 'Currency',
      isAr ? 'الحالة' : 'Status',
    ];
    const rows = sortedInvoices.map((inv) => [
      inv.invoiceNumber,
      inv.clientName,
      inv.clientCompany || '',
      resolveRecordBranch(inv, branchesById, currentBranch, language).name,
      inv.issueDate,
      inv.dueDate,
      inv.subtotal,
      inv.taxPercent,
      inv.totalAmount,
      inv.currency,
      inv.status,
    ]);
    downloadCsvSafe(
      `atrium_freelance_invoices_${new Date().toISOString().split('T')[0]}.csv`,
      headers,
      rows
    );
  }, [sortedInvoices, branchesById, currentBranch, language, isAr, isFr]);

  const handleBatchMarkPaid = () => {
    if (selectedInvoiceIds.size === 0) return;
    selectedInvoiceIds.forEach((id) => {
      updateInvoiceStatus(id, 'Paid');
    });
    const count = selectedInvoiceIds.size;
    setSelectedInvoiceIds(new Set());
    showToast({
      type: 'success',
      title: isAr ? 'تم التحديث' : isFr ? 'Mis à jour' : 'Updated',
      message: `${count} ${isAr ? 'فواتير تم تعليمها كمدفوعة' : 'invoices marked as Paid'}`,
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
      title: isAr ? 'تم التحديث' : isFr ? 'Mis à jour' : 'Updated',
      message: `${count} ${isAr ? 'فواتير تم تعليمها كمرسلة' : 'invoices marked as Sent'}`,
      category: 'freelance_solo',
    });
  };

  const handleBatchDelete = () => {
    if (selectedInvoiceIds.size === 0) return;
    const count = selectedInvoiceIds.size;
    selectedInvoiceIds.forEach((id) => {
      deleteFreelanceInvoice(id);
      if (selectedInvoice?.id === id) setSelectedInvoice(null);
    });
    setSelectedInvoiceIds(new Set());
    showToast({
      type: 'info',
      title: isAr ? 'تم الحذف' : isFr ? 'Suppression' : 'Deleted',
      message: `${count} ${isAr ? 'فواتير تم حذفها' : 'invoices deleted'}`,
      category: 'freelance_solo',
    });
  };

  const paidCount = freelanceInvoices.filter((i) => i.status === 'Paid').length;
  const paidTotal = freelanceInvoices
    .filter((i) => i.status === 'Paid')
    .reduce((acc, i) => acc + (i.totalAmount || 0), 0);
  const pendingCount = freelanceInvoices.filter(
    (i) => i.status === 'Sent' || i.status === 'Draft'
  ).length;
  const pendingTotal = freelanceInvoices
    .filter((i) => i.status === 'Sent' || i.status === 'Draft')
    .reduce((acc, i) => acc + (i.totalAmount || 0), 0);
  const overdueCount = freelanceInvoices.filter((i) => i.status === 'Overdue').length;
  const overdueTotal = freelanceInvoices
    .filter((i) => i.status === 'Overdue')
    .reduce((acc, i) => acc + (i.totalAmount || 0), 0);

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('free_inv_filter_all', language) },
      { value: 'sent', label: t('free_inv_filter_sent', language) },
      { value: 'paid', label: t('free_inv_filter_paid', language) },
      { value: 'overdue', label: t('free_inv_filter_overdue', language) },
      { value: 'draft', label: t('free_inv_filter_draft', language) },
    ],
    [t, language]
  );

  const filterSections: KineticFilterSection[] = useMemo(() => {
    const branchOpts = [
      {
        value: 'All',
        label: isAr ? 'كل الفروع' : isFr ? 'Toutes les branches' : 'All Branches',
        count: freelanceInvoices.length,
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
        id: 'currency',
        label: t('free_clients_currency', language),
        value: currencyFilter,
        onChange: setCurrencyFilter,
        resetValue: 'All',
        kind: 'segmented',
        options: [
          { value: 'All', label: t('common_all', language) },
          { value: 'DZD', label: 'DZD' },
          { value: 'EUR', label: 'EUR' },
          { value: 'USD', label: 'USD' },
        ],
      },
      {
        id: 'status',
        label: t('free_inv_table_status', language),
        value: selectedStatus,
        onChange: setSelectedStatus,
        resetValue: 'all',
        kind: 'segmented',
        options: statusOptions.map((o) => ({ value: o.value, label: String(o.label) })),
      },
    ];
  }, [
    isAr,
    isFr,
    freelanceInvoices.length,
    branchCounts,
    branchFilter,
    currencyFilter,
    selectedStatus,
    statusOptions,
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
    if (currencyFilter !== 'All') {
      chips.push({
        key: 'currency',
        label: currencyFilter,
        onRemove: () => setCurrencyFilter('All'),
      });
    }
    if (selectedStatus !== 'all') {
      const m = statusOptions.find((o) => o.value === selectedStatus);
      chips.push({
        key: 'status',
        label: String(m?.label || selectedStatus),
        onRemove: () => setSelectedStatus('all'),
      });
    }
    return chips;
  }, [branchFilter, currencyFilter, selectedStatus, statusOptions, isAr, isFr]);

  const activeFiltersCount =
    (branchFilter !== 'All' ? 1 : 0) +
    (currencyFilter !== 'All' ? 1 : 0) +
    (selectedStatus !== 'all' ? 1 : 0);

  const { showSkeleton, isTimedOut, isOffline } = useSkeletonLoading({
    isLoading: isSyncing || networkMode === 'force_skeleton',
    hasCachedData: (freelanceInvoices || []).length > 0,
  });

  if (showSkeleton && ((freelanceInvoices || []).length === 0 || networkMode === 'force_skeleton')) {
    return (
      <SkeletonCollectionScreen
        kpiCount={3}
        columns={[
          { width: '2.5*', minWidth: '220px' },
          { width: '1.5*', minWidth: '130px' },
          { width: '1.2*', minWidth: '100px' },
          { width: '1.4*', minWidth: '120px' },
          { width: '1.4*', minWidth: '120px' },
          { width: '1.2*', minWidth: '100px' },
        ]}
        hasIcon
        hasFacility
        hasActionBtn
        actionBtnWidth={130}
        isOffline={isOffline}
        isTimedOut={isTimedOut}
        onRetry={retryCloudSync}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <ScreenHeaderBar
        icon={<FileText size={22} />}
        title={t('free_inv_title', language)}
        subtitle={`${freelanceInvoices.length} ${t('free_inv_title', language).toLowerCase()}`}
        secondaryActions={
          <AtriumButton
            type="button"
            variant="secondary"
            size="md"
            icon={<Clock size={15} />}
            onClick={handleBillAllUnbilled}
          >
            {isAr ? 'فوترة الساعات المتبقية' : isFr ? 'Facturer Heures' : 'Bill Unbilled Hours'}
          </AtriumButton>
        }
        primaryAction={{
          label: t('free_inv_btn_new', language),
          onClick: () => setIsCreateModalOpen(true),
          icon: <Plus size={16} strokeWidth={2.2} />,
          dataAction: 'add-freelance-invoice',
        }}
      />

      <ScreenKpiBanner
        heading={
          isAr
            ? 'مؤشرات الفوترة والمستحقات المالية'
            : isFr
            ? 'Indicateurs de Facturation & Recouvrement'
            : 'Billing & Cash Flow Indicators'
        }
        language={language}
        primaryCard={{
          label: t('free_inv_filter_paid', language),
          badgeText: `${paidCount} ${isAr ? 'مدفوعة' : isFr ? 'payées' : 'paid'}`,
          count: Math.round(paidTotal),
          formatValue: (n) => formatCurrencyAmount(n, 'EUR'),
          tone: 'emerald',
          isActive: selectedStatus === 'paid',
          onToggle: () => setSelectedStatus((prev) => (prev === 'paid' ? 'all' : 'paid')),
        }}
        secondaryCard={{
          label: isAr
            ? 'فواتير مرسلة وبانتظار الدفع'
            : isFr
            ? 'Factures Envoyées'
            : 'Sent & In Progress',
          badgeText: `${pendingCount} ${isAr ? 'معلقة' : isFr ? 'en attente' : 'pending'}`,
          count: Math.round(pendingTotal),
          formatValue: (n) => formatCurrencyAmount(n, 'EUR'),
          tone: 'terracotta',
          isActive: selectedStatus === 'sent',
          onToggle: () => setSelectedStatus((prev) => (prev === 'sent' ? 'all' : 'sent')),
        }}
        darkCard={{
          label: t('free_inv_filter_overdue', language),
          badgeCount: overdueCount,
          badgePrefix: '',
          badgeSuffix: isAr ? 'متأخرة' : isFr ? 'en retard' : 'overdue',
          valueCount: Math.round(overdueTotal),
          formatValue: (n) => formatCurrencyAmount(n, 'EUR'),
          caption:
            overdueCount > 0
              ? isAr
                ? `${overdueCount} فواتير تجاوزت الاستحقاق`
                : isFr
                ? `${overdueCount} créance(s) échue(s)`
                : `${overdueCount} overdue receivable(s)`
              : isAr
              ? 'جميع فواتير العملاء مسددة'
              : isFr
              ? 'Toutes les échéances sont respectées'
              : 'All invoices within due dates',
        }}
      />

      <ScreenPod>
        <ScreenCollectionToolbar
          title={t('free_inv_title', language)}
          liveRegionText={`${sortedInvoices.length} ${t('free_inv_title', language).toLowerCase()}`}
          language={language}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('free_search_clients_ph', language)}
          statusOptions={statusOptions}
          statusValue={selectedStatus}
          onStatusChange={setSelectedStatus}
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
            setCurrencyFilter('All');
            setSelectedStatus('all');
            setSearchQuery('');
          }}
        />

        {selectedInvoiceIds.size > 0 && (
          <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-[#FCEEE8] dark:bg-neutral-800 border border-[#F5E2D8] dark:border-neutral-700 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d4522f] animate-pulse" />
              <span className="text-xs font-bold text-black dark:text-white">
                {selectedInvoiceIds.size}{' '}
                {isAr
                  ? 'فواتير محددة'
                  : isFr
                  ? 'factures sélectionnées'
                  : 'invoices selected'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedInvoiceIds(new Set())}
                className="px-3 py-1.5 text-xs text-black/70 dark:text-white/75 hover:text-black dark:hover:text-white font-medium cursor-pointer"
              >
                {isAr ? 'إلغاء التحديد' : isFr ? 'Désélectionner' : 'Deselect'}
              </button>
              <button
                type="button"
                onClick={handleBatchMarkPaid}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle size={13} />
                <span>
                  {isAr ? 'تعليم كمدفوعة' : isFr ? 'Marquer Payé' : 'Mark Paid'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleBatchMarkSent}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Send size={13} />
                <span>
                  {isAr ? 'تعليم كمرسلة' : isFr ? 'Marquer Envoyé' : 'Mark Sent'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleBatchDelete}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 size={13} />
                <span>{isAr ? 'حذف المحدد' : isFr ? 'Supprimer' : 'Delete'}</span>
              </button>
            </div>
          </div>
        )}

        <UniversalDataCollection<FreelanceInvoice>
          hideToolbar
          data={sortedInvoices}
          keyExtractor={(inv) => inv.id}
          viewMode={viewMode}
          columns={invoiceColumns}
          isLoading={isSyncing || networkMode === 'force_skeleton'}
          isOffline={networkMode === 'offline'}
          isTimedOut={isSyncTimeout}
          lastSyncedAt={lastSyncedAt}
          onRetrySync={retryCloudSync}
          sortBy={invoiceSortBy}
          sortDirection={invoiceSortDir}
          onSortChange={(key, dir) => {
            setInvoiceSortBy(key);
            setInvoiceSortDir(dir);
          }}
          openItemId={activeInspectorInvoice?.id ?? null}
          renderCard={(inv) => (
            <div className="flex flex-col justify-between w-full h-full space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono font-bold text-black dark:text-white text-sm">
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
                      : 'text-black/70 bg-neutral-100 dark:bg-neutral-800 dark:text-white/75'
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
                <h4 className="text-sm font-bold text-black dark:text-white leading-snug truncate">
                  {inv.clientName}
                </h4>
                <div className="text-[11px] text-black/55 dark:text-white/55 truncate mt-0.5">
                  {inv.clientCompany || t('free_inv_direct_client', language)}
                </div>
              </div>
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-black/55 dark:text-white/55 text-[11px] flex items-center gap-1">
                    <Calendar size={11} />
                    {t('free_inv_table_due', language)}: {inv.dueDate}
                  </span>
                  <span className="font-mono font-black text-sm text-[#d4522f] tabular-nums">
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
                    className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black/70 dark:text-white/75 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
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
          onItemClick={(inv, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedInvoice(inv);
          }}
          onViewDetails={(inv, el) => {
            setDrawerOpenerEl(el || null);
            setSelectedInvoice(inv);
          }}
          onPinToggle={(idOrItem) => {
            const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
            const target = freelanceInvoices.find((i) => i.id === id);
            setPinnedInvoiceIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) {
                next.delete(id);
                if (target) {
                  showToast({
                    type: 'info',
                    title: 'Unpinned',
                    message: `${target.invoiceNumber} unpinned`,
                  });
                }
              } else {
                next.add(id);
                if (target) {
                  showToast({
                    type: 'info',
                    title: 'Pinned',
                    message: `${target.invoiceNumber} pinned to top`,
                  });
                }
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
              iconColor: '#d4522f',
              onClick: () => setPreviewInvoice(inv),
            },
          ]}
          pinnedIds={pinnedInvoiceIds}
          selectedIds={selectedInvoiceIds}
          onSelectionChange={setSelectedInvoiceIds}
          emptyTitle={t('free_inv_empty_title', language)}
          emptyDescription={t('free_inv_empty_desc', language)}
          primaryActionLabel={t('free_inv_btn_new', language)}
          onAddFirstItem={() => setIsCreateModalOpen(true)}
        />
      </ScreenPod>

      <KineticFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        triggerRef={filterButtonRef}
        language={language}
        displayCount={sortedInvoices.length}
        entityPluralLabel={t('free_inv_title', language).toLowerCase()}
        hasActiveFilters={activeFiltersCount > 0}
        onResetFilters={() => {
          setBranchFilter('All');
          setCurrencyFilter('All');
          setSelectedStatus('all');
        }}
        sections={filterSections}
      />

      <KineticSlideOverInspector<FreelanceInvoice>
        isOpen={Boolean(activeInspectorInvoice)}
        item={activeInspectorInvoice}
        allItems={sortedInvoices}
        keyExtractor={(inv) => inv.id}
        openerElement={drawerOpenerEl}
        language={language}
        title={activeInspectorInvoice?.invoiceNumber || ''}
        subtitle={
          activeInspectorInvoice
            ? `${activeInspectorInvoice.clientName}${
                activeInspectorInvoice.clientCompany
                  ? ` · ${activeInspectorInvoice.clientCompany}`
                  : ''
              }`
            : ''
        }
        avatarText="F"
        avatarColor="#d4522f"
        branchName={
          activeInspectorInvoice
            ? resolveRecordBranch(activeInspectorInvoice, branchesById, currentBranch, language).name
            : undefined
        }
        statusLabel={
          activeInspectorInvoice
            ? activeInspectorInvoice.status === 'Paid'
              ? t('free_invoice_status_paid', language)
              : activeInspectorInvoice.status === 'Overdue'
              ? t('free_invoice_status_overdue', language)
              : activeInspectorInvoice.status === 'Sent'
              ? t('free_invoice_status_sent', language)
              : t('free_invoice_status_draft', language)
            : undefined
        }
        onSelectItem={(inv) => setSelectedInvoice(inv)}
        onClose={() => setSelectedInvoice(null)}
        onDelete={(inv) => setInvoiceToDelete(inv)}
        holdToDelete={false}
        renderBody={(inv) => (
          <div className="space-y-5 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <AtriumButton
                type="button"
                variant="primary"
                size="sm"
                icon={<Printer size={13} />}
                onClick={() => setPreviewInvoice(inv)}
              >
                {t('free_inv_doc_print', language)}
              </AtriumButton>
              {inv.status !== 'Paid' && (
                <AtriumButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<CheckCircle size={13} />}
                  onClick={() => updateInvoiceStatus(inv.id, 'Paid')}
                >
                  {t('free_inv_doc_mark_paid_btn', language)}
                </AtriumButton>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-[#E6DED6] dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
                <span className="text-[10px] text-black/55 dark:text-white/55 uppercase tracking-wider block">
                  {t('free_inv_table_amount', language)}
                </span>
                <span className="text-lg font-mono font-bold text-[#d4522f] tabular-nums">
                  {formatCurrencyAmount(inv.totalAmount, inv.currency)}
                </span>
              </div>
              <div className="p-3 rounded-xl border border-[#E6DED6] dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
                <span className="text-[10px] text-black/55 dark:text-white/55 uppercase tracking-wider block">
                  {t('free_inv_table_due', language)}
                </span>
                <span className="text-base font-bold text-black dark:text-white tabular-nums">
                  {inv.dueDate}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-semibold text-black dark:text-white block">
                {t('free_deliv_title', language)} ({inv.items.length})
              </span>
              <div className="space-y-1.5">
                {inv.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#F3EDE7] dark:bg-neutral-900/60 border border-[#E6DED6] dark:border-neutral-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-black dark:text-white truncate">
                        {item.description}
                      </div>
                      <div className="text-[10px] text-black/55 dark:text-white/55 tabular-nums">
                        {item.quantity} × {formatCurrencyAmount(item.unitRate, inv.currency)}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-black dark:text-white shrink-0 tabular-nums">
                      {formatCurrencyAmount(item.total, inv.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {inv.notes && (
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-[11px] text-black/70 dark:text-white/75">
                {inv.notes}
              </div>
            )}
          </div>
        )}
      />

      {/* Create Invoice Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-black dark:text-white">
                  {t('free_inv_modal_new_title', language)}
                </h3>
                <p className="text-xs text-black/55 dark:text-white/55 mt-0.5">
                  {t('free_inv_modal_new_desc', language)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-black/55 dark:text-white/55 hover:text-black/80 dark:hover:text-white cursor-pointer"
                aria-label="Close"
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
                      const clientId = extractStr(val);
                      setTargetClientId(clientId);
                      const cl = freelanceClients.find((c) => c.id === clientId);
                      if (cl) setCurrency(cl.currency);
                    }}
                    options={freelanceClients.map((c) => ({
                      value: c.id,
                      label: c.name,
                      sublabel: `${c.company || t('free_clients_private_badge', language)} · ${
                        c.currency
                      }`,
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
                    onChange={(val) => setCurrency(extractStr(val) as CurrencyCode)}
                    options={[
                      { value: 'DZD', label: 'DZD' },
                      { value: 'EUR', label: 'EUR' },
                      { value: 'USD', label: 'USD' },
                    ]}
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
                  onChange={(v) => setDueDate(extractStr(v))}
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
                  value={String(taxPercent)}
                  onChange={(val) => setTaxPercent(Number(extractStr(val)) || 0)}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-black dark:text-white">
                    {t('free_deliv_title', language)}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-[#d4522f] hover:underline font-semibold cursor-pointer"
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
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-black dark:text-white"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder={t('free_inv_ph_qty', language)}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="w-16 px-2 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-black dark:text-white text-right"
                      />
                      <input
                        type="number"
                        min="0"
                        placeholder={t('free_inv_ph_rate', language)}
                        value={item.unitRate}
                        onChange={(e) => handleItemChange(idx, 'unitRate', Number(e.target.value))}
                        className="w-24 px-2 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-black dark:text-white text-right"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 text-black/55 dark:text-white/55 hover:text-rose-500 cursor-pointer"
                          aria-label="Remove line"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-semibold text-black/70 dark:text-white/75 block mb-1">
                  {t('free_inv_notes_terms', language)}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('free_inv_notes_ph', language)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-black dark:text-white"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  {t('free_clients_cancel', language)}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#d4522f] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  {t('free_inv_btn_new', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Invoice Modal */}
      {invoiceToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1C1C1E] border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-black dark:text-white">
                  {t('common_delete', language)}
                </h3>
                <p className="text-xs text-black/55 dark:text-white/55">
                  #{invoiceToDelete.invoiceNumber}
                </p>
              </div>
            </div>
            <p className="text-xs text-black/70 dark:text-white/75 leading-relaxed">
              {t('free_clients_delete_confirm', language)}{' '}
              <strong className="text-black dark:text-white font-semibold">
                #{invoiceToDelete.invoiceNumber}
              </strong>{' '}
              ({invoiceToDelete.clientName})?
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setInvoiceToDelete(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-black/70 dark:text-white/75 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                {t('free_clients_cancel', language)}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteFreelanceInvoice(invoiceToDelete.id);
                  if (selectedInvoice?.id === invoiceToDelete.id) setSelectedInvoice(null);
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
