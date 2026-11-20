import React, { useMemo, useState } from 'react';
import { History, Wrench, Eye } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useGarageData } from './garageData';
import { formatMoney } from '../../../utils/rules';
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

interface GarageLedgerItem {
  id: string;
  group: 'repair_orders' | 'invoices_parts';
  kindLabel: string;
  docNumber: string;
  vehiclePlate: string;
  clientName: string;
  subtitleText: string;
  amountDzd: number;
  status: string;
  dateStr: string;
  branchId?: string;
}

export const AutoGarageHistoryView: React.FC = React.memo(() => {
  const {
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
  const { orders, invoices } = useGarageData();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const l3 = (ar: string, fr: string, en: string) => (isAr ? ar : isEn ? en : fr);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [selectedItem, setSelectedItem] = useState<GarageLedgerItem | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const allItems = useMemo<GarageLedgerItem[]>(() => {
    const out: GarageLedgerItem[] = [];
    (orders || []).forEach((o) => {
      out.push({
        id: `ro_${o.id}`,
        group: 'repair_orders',
        kindLabel: l3('أمر إصلاح OR', 'Ordre OR', 'Repair Order'),
        docNumber: o.orderNumber,
        vehiclePlate: `${o.vehiclePlate} · ${o.vehicleModel}`,
        clientName: o.clientName,
        subtitleText: `${o.technicianName} · ${o.partsUsed?.length || 0} ${l3('قطع', 'pièces', 'parts')}`,
        amountDzd: o.finalCostDzd || o.estimatedCostDzd || 0,
        status: o.status,
        dateStr: o.intakeDate,
        branchId: o.branchId,
      });
    });
    (invoices || []).forEach((inv) => {
      out.push({
        id: `ginv_${inv.id}`,
        group: 'invoices_parts',
        kindLabel: inv.billingType === 'facture_dgi' ? 'Facture DGI' : 'Bon de caisse',
        docNumber: inv.invoiceNumber,
        vehiclePlate: `${inv.vehiclePlate} · ${inv.vehicleModel}`,
        clientName: inv.clientName,
        subtitleText: `${inv.paymentMethod} · OR ${inv.orderNumber}`,
        amountDzd: inv.netToPayDzd || inv.totalTtc || 0,
        status: inv.isPaid ? l3('مدفوع', 'Encaissé', 'Paid') : l3('غير مدفوع', 'En attente', 'Unpaid'),
        dateStr: inv.issuedAt,
        branchId: inv.branchId,
      });
    });
    return out;
  }, [orders, invoices, isAr, isEn]);

  const stats = useMemo(() => {
    const roCount = allItems.filter((i) => i.group === 'repair_orders').length;
    const invCount = allItems.filter((i) => i.group === 'invoices_parts').length;
    const billedDzd = (invoices || []).reduce((s, inv) => s + (inv.netToPayDzd || inv.totalTtc || 0), 0);
    const branchCounts = new Map<string, number>();
    allItems.forEach((it) => {
      const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalCount: allItems.length,
      roCount,
      invCount,
      billedDzd,
      branchOptions: Array.from(branchCounts.entries()).map(([name, count]) => ({ value: name, label: name, count })),
    };
  }, [allItems, invoices, branchesById, currentBranch, language]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((it) => {
      if (statusFilter === 'repair_orders' && it.group !== 'repair_orders') return false;
      if (statusFilter === 'invoices_parts' && it.group !== 'invoices_parts') return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const hay = `${it.docNumber} ${it.vehiclePlate} ${it.clientName} ${it.subtitleText} ${it.kindLabel}`.toLowerCase();
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
      if (sortBy === 'doc') return a.docNumber.localeCompare(b.docNumber) * sign;
      if (sortBy === 'amount') return (a.amountDzd - b.amountDzd) * sign;
      return (new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()) * sign;
    });
  }, [filteredItems, pinnedIds, sortBy, sortDir]);

  const columns = useMemo<ColumnDefinition<GarageLedgerItem>[]>(
    () => [
      {
        key: 'doc',
        header: l3('الأمر والمركبة', 'N° OR / Véhicule', 'Order & Vehicle'),
        sortable: true,
        renderCell: (it) => (
          <div className="min-w-0">
            <span className="t-label font-semibold text-black dark:text-white truncate block">{it.docNumber}</span>
            <span className="t-cap text-black/62 dark:text-white/65 truncate block">{it.vehiclePlate} · {it.kindLabel}</span>
          </div>
        ),
      },
      {
        key: 'client',
        header: l3('الزبون والفني', 'Client & Atelier', 'Client & Tech'),
        renderCell: (it) => (
          <div className="min-w-0">
            <span className="t-small font-medium text-black dark:text-white truncate block">{it.clientName}</span>
            <span className="t-cap text-black/60 dark:text-white/60 truncate block">{it.subtitleText}</span>
          </div>
        ),
      },
      {
        key: 'amount',
        header: l3('المبلغ والتاريخ', 'Total TTC & Date', 'Amount & Date'),
        sortable: true,
        renderCell: (it) => (
          <div className="tabular-nums">
            <span className="t-label font-semibold text-black dark:text-white block">{formatMoney(it.amountDzd)}</span>
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
    <VerticalHistoryScaffold<GarageLedgerItem>
      icon={<History size={22} />}
      title={l3('سجل الورشة والمركبات', 'Historique Garage & Atelier', 'Auto Garage History')}
      primaryAction={{
        label: l3('أوامر الإصلاح', 'Ordres OR', 'Repair Orders'),
        icon: <Wrench size={16} />,
        onClick: () => setScreen('scheduler'),
      }}
      kpiHeading={l3('تدقيق أوامر الإصلاح والفوترة', 'Audit OR, Pièces & Facturation DGI', 'Workshop & Billing Audit')}
      primaryCard={{
        label: l3('أوامر الإصلاح OR', 'Ordres de Réparation', 'Repair Orders'),
        badgeText: `${stats.roCount} ordres`,
        count: stats.roCount,
        tone: 'emerald',
        isActive: statusFilter === 'repair_orders',
        onToggle: () => setStatusFilter((p) => (p === 'repair_orders' ? 'all' : 'repair_orders')),
      }}
      secondaryCard={{
        label: l3('الفواتير والقطع', 'Factures & Bons', 'Invoices & Receipts'),
        badgeText: `${stats.invCount} factures`,
        count: stats.invCount,
        tone: 'terracotta',
        isActive: statusFilter === 'invoices_parts',
        onToggle: () => setStatusFilter((p) => (p === 'invoices_parts' ? 'all' : 'invoices_parts')),
      }}
      darkCard={{
        label: l3('إجمالي الفواتير', 'Chiffre Facturé Atelier', 'Workshop Billed Total'),
        badgePrefix: '',
        badgeCount: stats.totalCount,
        badgeSuffix: l3('سجلات', 'pièces', 'records'),
        valuePrefix: '',
        valueCount: stats.billedDzd,
        formatValue: (n) => formatMoney(n),
        caption: `${currentBranch?.name || 'Atelier'} · DGI & OR Trail`,
      }}
      podTitle={l3('سجل أوامر الإصلاح والفواتير', 'Registre Ordres OR & Facturation', 'Repair Orders & Invoices Log')}
      searchPlaceholder={l3('بحث برقم اللوحة، الأمر، الزبون...', 'Rechercher N° OR, matricule, client...', 'Search plate, OR #, client...')}
      vertical="auto_garage"
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
        { value: 'repair_orders', label: l3('أوامر OR', 'Ordres OR', 'Orders OR'), count: stats.roCount },
        { value: 'invoices_parts', label: l3('الفواتير والقطع', 'Factures & Pièces', 'Invoices & Parts'), count: stats.invCount },
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
        title: it.docNumber,
        subline: `${it.vehiclePlate} · ${it.clientName} · ${new Date(it.dateStr).toLocaleDateString()}`,
        categoryLabel: it.kindLabel,
        statusLabel: it.status,
        statusVariant: it.group === 'repair_orders' ? 'warning' : 'active',
        metricPrimary: formatMoney(it.amountDzd),
        metricSecondary: it.subtitleText,
        detailCol1: { heading: l3('المرجع', 'N° Pièce', 'Ref'), primaryText: it.docNumber, secondaryText: it.vehiclePlate },
        detailCol2: { heading: l3('الزبون والفني', 'Client & Technicien', 'Client & Tech'), primaryText: it.clientName, secondaryText: it.subtitleText },
        detailCol3: { heading: l3('المبلغ', 'Montant', 'Amount'), primaryText: formatMoney(it.amountDzd), secondaryText: it.status },
      })}
      getFanActions={(it) => [
        { id: 'view', label: l3('التفاصيل', 'Détails', 'Inspect'), icon: <Eye className="w-[15px] h-[15px]" />, onClick: () => setSelectedItem(it) },
      ]}
      filterSections={
        stats.branchOptions.length > 0
          ? [{
              id: 'branch',
              label: l3('الورشة', 'Atelier / Site', 'Site'),
              value: branchFilter,
              onChange: setBranchFilter,
              kind: 'tiles',
              columns: 2,
              options: [{ value: 'All', label: l3('كل الفروع', 'Tous', 'All Sites'), count: allItems.length }, ...stats.branchOptions],
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
          `atrium-garage-history-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Type', 'Doc #', 'Vehicle', 'Client', 'Details', 'Amount DZD', 'Status', 'Date'],
          sortedItems.map((i) => [i.kindLabel, i.docNumber, i.vehiclePlate, i.clientName, i.subtitleText, i.amountDzd, i.status, i.dateStr])
        )
      }
      entityPluralLabel={l3('سجلات', 'ordres', 'records')}
      emptyTitle={l3('لا توجد عمليات ورشة', 'Aucun historique atelier', 'No garage history yet')}
      emptyDescription={l3('ستظهر أوامر الإصلاح والفواتير هنا', 'Les ordres de réparation et factures apparaîtront ici.', 'Repair orders and workshop invoices appear here.')}
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      inspectorConfig={{
        title: (it) => it.docNumber,
        subtitle: (it) => `${it.kindLabel} · ${it.vehiclePlate}`,
        categoryLabel: (it) => it.kindLabel,
        statusLabel: (it) => it.status,
        renderBody: (it) => (
          <InspectorSection index={0} title={l3('تفاصيل العملية', 'Détails Atelier', 'Workshop Details')}>
            <InspectorCard>
              <InspectorKeyValue label={l3('النوع', 'Type', 'Type')} value={it.kindLabel} />
              <InspectorKeyValue label={l3('المرجع', 'Numéro', 'Number')} value={it.docNumber} mono />
              <InspectorKeyValue label={l3('المركبة', 'Véhicule', 'Vehicle')} value={it.vehiclePlate} />
              <InspectorKeyValue label={l3('الزبون', 'Client', 'Client')} value={it.clientName} />
              <InspectorKeyValue label={l3('التفاصيل', 'Détails', 'Details')} value={it.subtitleText} />
              <InspectorKeyValue label={l3('المبلغ', 'Montant TTC', 'Amount TTC')} value={formatMoney(it.amountDzd)} mono />
              <InspectorKeyValue label={l3('الحالة', 'Statut', 'Status')} value={it.status} />
            </InspectorCard>
          </InspectorSection>
        ),
      }}
    />
  );
});
