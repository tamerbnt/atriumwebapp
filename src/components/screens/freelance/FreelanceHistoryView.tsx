import React, { useMemo, useState } from 'react';
import { History, Clock, FileText, Eye } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { formatDuration, formatMoney } from '../../../utils/rules';
import { VerticalHistoryScaffold } from '../../common/history/VerticalHistoryScaffold';
import { ColumnDefinition } from '../../ui/collection';
import {
  InspectorCard,
  InspectorKeyValue,
  InspectorSection,
  KineticRowData,
  buildBranchesByIdMap,
  downloadCsvSafe,
  resolveRecordBranch,
} from '../../ui/kinetic';

interface FreelanceLedgerItem {
  id: string;
  group: 'time' | 'billing';
  kindLabel: string;
  title: string;
  clientName: string;
  metricText: string;
  amountValue: number;
  currency: string;
  status: string;
  dateStr: string;
  branchId?: string;
}

export const FreelanceHistoryView: React.FC = React.memo(() => {
  const {
    timeLogs,
    freelanceInvoices,
    freelanceProposals,
    branches,
    currentBusinessId,
    currentBranchId,
    currentBranch,
    language,
    isSyncing,
    networkMode,
    isSyncTimeout,
    lastSyncedAt,
    retryCloudSync,
    setScreen,
  } = useAtriumStore();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const l3 = (ar: string, fr: string, en: string) => (isAr ? ar : isEn ? en : fr);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [selectedItem, setSelectedItem] = useState<FreelanceLedgerItem | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const allItems = useMemo<FreelanceLedgerItem[]>(() => {
    const out: FreelanceLedgerItem[] = [];
    (timeLogs || []).forEach((log) => {
      const hours = log.durationSeconds / 3600;
      const estimatedVal = log.isBillable ? Math.round(hours * (log.rateAtMoment || 0)) : 0;
      out.push({
        id: `tl_${log.id}`,
        group: 'time',
        kindLabel: l3('توقيت', 'Temps suivi', 'Time Log'),
        title: log.taskDescription || log.projectTitle,
        clientName: log.clientName,
        metricText: formatDuration(log.durationSeconds),
        amountValue: estimatedVal,
        currency: log.currency || 'DZD',
        status: log.isInvoiced ? l3('مفوتر', 'Facturé', 'Invoiced') : log.isBillable ? l3('قابل للفوترة', 'Facturable', 'Billable') : l3('داخلي', 'Interne', 'Internal'),
        dateStr: log.date || log.createdAt,
        branchId: log.branchId,
      });
    });
    (freelanceInvoices || []).forEach((inv) => {
      out.push({
        id: `inv_${inv.id}`,
        group: 'billing',
        kindLabel: l3('فاتورة', 'Facture', 'Invoice'),
        title: inv.invoiceNumber,
        clientName: inv.clientName,
        metricText: `${inv.items.length} ${l3('بنود', 'lignes', 'items')}`,
        amountValue: inv.totalAmount,
        currency: inv.currency || 'DZD',
        status: inv.status,
        dateStr: inv.issueDate || inv.createdAt,
        branchId: inv.branchId,
      });
    });
    (freelanceProposals || []).forEach((prop) => {
      out.push({
        id: `prop_${prop.id}`,
        group: 'billing',
        kindLabel: l3('عرض سعر', 'Devis', 'Proposal'),
        title: prop.title,
        clientName: prop.clientName,
        metricText: `${prop.estimatedTimelineWeeks}w`,
        amountValue: prop.proposedBudget,
        currency: prop.currency || 'DZD',
        status: prop.status,
        dateStr: prop.createdAt,
        branchId: prop.branchId,
      });
    });
    return out;
  }, [timeLogs, freelanceInvoices, freelanceProposals, isAr, isEn]);

  const stats = useMemo(() => {
    const timeCount = allItems.filter((i) => i.group === 'time').length;
    const billingCount = allItems.filter((i) => i.group === 'billing').length;
    const totalBilled = (freelanceInvoices || []).reduce((s, inv) => s + (inv.totalAmount || 0), 0);
    const branchCounts = new Map<string, number>();
    allItems.forEach((it) => {
      const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalCount: allItems.length,
      timeCount,
      billingCount,
      totalBilled,
      branchOptions: Array.from(branchCounts.entries()).map(([name, count]) => ({ value: name, label: name, count })),
    };
  }, [allItems, freelanceInvoices, branchesById, currentBranch, language]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((it) => {
      if (statusFilter === 'time' && it.group !== 'time') return false;
      if (statusFilter === 'billing' && it.group !== 'billing') return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const hay = `${it.title} ${it.clientName} ${it.kindLabel} ${it.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allItems, statusFilter, branchFilter, searchQuery, branchesById, currentBranch, language]);

  const sortedItems = useMemo(() => {
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filteredItems].sort((a, b) => {
      const pa = pinnedIds.has(a.id) ? 0 : 1;
      const pb = pinnedIds.has(b.id) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (sortBy === 'title') return a.title.localeCompare(b.title) * sign;
      if (sortBy === 'amount') return (a.amountValue - b.amountValue) * sign;
      return (new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()) * sign;
    });
  }, [filteredItems, pinnedIds, sortBy, sortDir]);

  const columns = useMemo<ColumnDefinition<FreelanceLedgerItem>[]>(
    () => [
      {
        key: 'title',
        header: l3('المهمة / المستند', 'Activité & Document', 'Task & Document'),
        sortable: true,
        renderCell: (it) => (
          <div className="min-w-0">
            <span className="t-label font-semibold text-black dark:text-white truncate block">{it.title}</span>
            <span className="t-cap text-black/62 dark:text-white/65 truncate block">{it.kindLabel} · {it.metricText}</span>
          </div>
        ),
      },
      {
        key: 'client',
        header: l3('العميل', 'Client', 'Client'),
        renderCell: (it) => <span className="t-small font-medium text-black dark:text-white truncate block">{it.clientName}</span>,
      },
      {
        key: 'amount',
        header: l3('القيمة والتاريخ', 'Valeur & Date', 'Value & Date'),
        sortable: true,
        renderCell: (it) => (
          <div className="tabular-nums">
            <span className="t-label font-semibold text-black dark:text-white block">
              {it.amountValue > 0 ? formatMoney(it.amountValue, it.currency) : it.metricText}
            </span>
            <span className="t-cap text-black/60 dark:text-white/60 block">{new Date(it.dateStr).toLocaleDateString()}</span>
          </div>
        ),
      },
      {
        key: 'status',
        header: l3('الحالة', 'Statut', 'Status'),
        renderCell: (it) => <span className="t-small font-semibold text-[var(--facility-accent,var(--brand-text))]">{it.status}</span>,
      },
    ],
    [isAr, isEn]
  );

  return (
    <VerticalHistoryScaffold<FreelanceLedgerItem>
      icon={<History size={22} />}
      title={l3('سجل النشاط المستقل', 'Historique Solo & Facturation', 'Freelance Activity History')}
      primaryAction={{
        label: l3('الفواتير', 'Factures', 'Invoices'),
        icon: <FileText size={16} />,
        onClick: () => setScreen('shop'),
      }}
      kpiHeading={l3('سجل الساعات والفواتير', 'Suivi Temps, Factures & Devis', 'Time & Billing Ledger')}
      primaryCard={{
        label: l3('ساعات العمل', 'Sessions de Temps', 'Time Logs'),
        badgeText: `${stats.timeCount} sessions`,
        count: stats.timeCount,
        tone: 'emerald',
        isActive: statusFilter === 'time',
        onToggle: () => setStatusFilter((p) => (p === 'time' ? 'all' : 'time')),
      }}
      secondaryCard={{
        label: l3('الفواتير والعروض', 'Factures & Devis', 'Invoices & Proposals'),
        badgeText: `${stats.billingCount} docs`,
        count: stats.billingCount,
        tone: 'terracotta',
        isActive: statusFilter === 'billing',
        onToggle: () => setStatusFilter((p) => (p === 'billing' ? 'all' : 'billing')),
      }}
      darkCard={{
        label: l3('إجمالي الفوترة', 'Volume Facturé Total', 'Total Billed Volume'),
        badgePrefix: '',
        badgeCount: stats.totalCount,
        badgeSuffix: l3('عمليات', 'entrées', 'records'),
        valuePrefix: '',
        valueCount: stats.totalBilled,
        formatValue: (n) => formatMoney(n),
        caption: `${currentBranch?.name || 'Solo Studio'} · Audit Timeline`,
      }}
      podTitle={l3('السجل الزمني للعمليات', 'Journal Solo & Transactions', 'Activity & Billing Ledger')}
      searchPlaceholder={l3('بحث في الوقت، الفواتير، العملاء...', 'Rechercher tâche, facture, client...', 'Search time log, invoice, client...')}
      vertical="freelance_solo"
      businessId={currentBusinessId}
      branchId={currentBranchId}
      language={language}
      isRtl={isAr}
      isSyncing={isSyncing}
      networkMode={networkMode}
      isSyncTimeout={isSyncTimeout}
      lastSyncedAt={lastSyncedAt}
      onRetrySync={retryCloudSync}
      statusOptions={[
        { value: 'all', label: l3('الكل', 'Tous', 'All'), count: stats.totalCount },
        { value: 'time', label: l3('الوقت', 'Temps', 'Time'), count: stats.timeCount },
        { value: 'billing', label: l3('الفواتير والعروض', 'Factures & Devis', 'Invoices & Quotes'), count: stats.billingCount },
      ]}
      statusValue={statusFilter}
      onStatusChange={setStatusFilter}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      items={sortedItems}
      totalItemCount={allItems.length}
      keyExtractor={(it) => it.id}
      columns={columns}
      sortBy={sortBy}
      sortDirection={sortDir}
      onSortChange={(k, d) => { setSortBy(k); setSortDir(d); }}
      pinnedIds={pinnedIds}
      onPinToggle={(x) => {
        const id = typeof x === 'string' ? x : x.id;
        setPinnedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }}
      getRowMeta={(it): Partial<KineticRowData> => ({
        title: it.title,
        subline: `${it.kindLabel} · ${it.clientName} · ${new Date(it.dateStr).toLocaleDateString()}`,
        categoryLabel: it.kindLabel,
        statusLabel: it.status,
        statusVariant: it.group === 'billing' ? 'active' : 'warning',
        metricPrimary: it.amountValue > 0 ? formatMoney(it.amountValue, it.currency) : it.metricText,
        metricSecondary: it.metricText,
        detailCol1: { heading: l3('النوع', 'Nature', 'Kind'), primaryText: it.kindLabel, secondaryText: it.title },
        detailCol2: { heading: l3('العميل', 'Client', 'Client'), primaryText: it.clientName, secondaryText: it.metricText },
        detailCol3: { heading: l3('المبلغ', 'Montant', 'Amount'), primaryText: it.amountValue > 0 ? formatMoney(it.amountValue, it.currency) : '—', secondaryText: it.status },
      })}
      getFanActions={(it) => [
        { id: 'view', label: l3('التفاصيل', 'Détails', 'Inspect'), icon: <Eye className="w-[15px] h-[15px]" />, onClick: () => setSelectedItem(it) },
      ]}
      filterSections={
        stats.branchOptions.length > 0
          ? [{
              id: 'branch',
              label: l3('الفرع', 'Branche', 'Branch'),
              value: branchFilter,
              onChange: setBranchFilter,
              kind: 'tiles',
              columns: 2,
              options: [{ value: 'All', label: l3('كل الفروع', 'Toutes', 'All Branches'), count: allItems.length }, ...stats.branchOptions],
            }]
          : []
      }
      activeChips={branchFilter !== 'All' ? [{ key: 'branch', label: branchFilter, onRemove: () => setBranchFilter('All') }] : []}
      hasActiveAdvancedFilters={branchFilter !== 'All'}
      activeFiltersCount={branchFilter !== 'All' ? 1 : 0}
      onResetFilters={() => {
        setStatusFilter('all');
        setBranchFilter('All');
        setSearchQuery('');
      }}
      onExportCsv={() =>
        downloadCsvSafe(
          `atrium-freelance-history-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Type', 'Title', 'Client', 'Metric', 'Amount', 'Currency', 'Status', 'Date'],
          sortedItems.map((i) => [i.kindLabel, i.title, i.clientName, i.metricText, i.amountValue, i.currency, i.status, i.dateStr])
        )
      }
      entityPluralLabel={l3('سجلات', 'enregistrements', 'records')}
      emptyTitle={l3('لا توجد عمليات مسجلة', 'Aucune activité trouvée', 'No activity records yet')}
      emptyDescription={l3('ستظهر جلسات العمل والفواتير هنا', 'Vos sessions suivies, factures et devis apparaîtront ici.', 'Time entries, invoices, and proposals appear here.')}
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      inspectorConfig={{
        title: (it) => it.title,
        subtitle: (it) => `${it.kindLabel} · ${it.clientName}`,
        categoryLabel: (it) => it.kindLabel,
        statusLabel: (it) => it.status,
        renderBody: (it) => (
          <InspectorSection index={0} title={l3('تفاصيل السجل', 'Détails', 'Record Details')}>
            <InspectorCard>
              <InspectorKeyValue label={l3('النوع', 'Type', 'Type')} value={it.kindLabel} />
              <InspectorKeyValue label={l3('العميل', 'Client', 'Client')} value={it.clientName} />
              <InspectorKeyValue label={l3('المقياس', 'Volume / Durée', 'Metric')} value={it.metricText} mono />
              <InspectorKeyValue label={l3('القيمة', 'Montant', 'Amount')} value={it.amountValue > 0 ? formatMoney(it.amountValue, it.currency) : '—'} mono />
              <InspectorKeyValue label={l3('الحالة', 'Statut', 'Status')} value={it.status} />
              <InspectorKeyValue label={l3('التاريخ', 'Date', 'Date')} value={new Date(it.dateStr).toLocaleString()} mono />
            </InspectorCard>
          </InspectorSection>
        ),
      }}
    />
  );
});
