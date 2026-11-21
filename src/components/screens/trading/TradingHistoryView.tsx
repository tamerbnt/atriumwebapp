import React, { useMemo, useState } from 'react';
import { History, FileText, Eye } from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentCommercialDocsFromState,
  selectCurrentPurchaseDocsFromState,
  selectCurrentStockVouchersFromState,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
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

interface TradingLedgerItem {
  id: string;
  group: 'sales_b2b' | 'purchases_depot';
  kindLabel: string;
  docNumber: string;
  partnerName: string;
  depotName: string;
  amount: number;
  currency: string;
  status: string;
  dateStr: string;
  branchId?: string;
}

export const TradingHistoryView: React.FC = React.memo(() => {
  const { commercialDocs, purchaseDocs, stockVouchers, branches, currentBusinessId, currentBranchId, currentBranch, language, isSyncing, networkMode, isSyncTimeout, lastSyncedAt } = useAtriumSelector(
    (s) => ({
      commercialDocs: selectCurrentCommercialDocsFromState(s),
      purchaseDocs: selectCurrentPurchaseDocsFromState(s),
      stockVouchers: selectCurrentStockVouchersFromState(s),
      branches: s.branches,
      currentBusinessId: s.currentBusinessId,
      currentBranchId: s.currentBranchId,
      currentBranch: selectCurrentBranchFromState(s),
      language: s.language,
      isSyncing: s.isSyncing,
      networkMode: s.networkMode || 'online',
      isSyncTimeout: s.isSyncTimeout || false,
      lastSyncedAt: s.lastSyncedAt,
    }),
    shallowEqualObjects
  );
  const { retryCloudSync, setScreen } = useAtriumActions();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const l3 = (ar: string, fr: string, en: string) => (isAr ? ar : isEn ? en : fr);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [selectedItem, setSelectedItem] = useState<TradingLedgerItem | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const allItems = useMemo<TradingLedgerItem[]>(() => {
    const out: TradingLedgerItem[] = [];
    (commercialDocs || []).forEach((d) => {
      out.push({
        id: `cd_${d.id}`,
        group: 'sales_b2b',
        kindLabel: d.type,
        docNumber: d.docNumber,
        partnerName: d.clientName,
        depotName: d.depotName || 'Dépôt Central',
        amount: d.netToPay,
        currency: d.currency || 'DZD',
        status: d.status,
        dateStr: d.date || d.createdAt,
        branchId: d.branchId,
      });
    });
    (purchaseDocs || []).forEach((p) => {
      out.push({
        id: `pd_${p.id}`,
        group: 'purchases_depot',
        kindLabel: p.type,
        docNumber: p.docNumber,
        partnerName: p.supplierName,
        depotName: p.depotName || 'Dépôt Central',
        amount: p.totalTtc,
        currency: p.currency || 'DZD',
        status: p.status,
        dateStr: p.orderDate || p.createdAt,
        branchId: p.branchId,
      });
    });
    (stockVouchers || []).forEach((v) => {
      out.push({
        id: `sv_${v.id}`,
        group: 'purchases_depot',
        kindLabel: v.type,
        docNumber: v.voucherNumber,
        partnerName: v.operatorName,
        depotName: v.depotTargetName ? `${v.depotSourceName} → ${v.depotTargetName}` : v.depotSourceName,
        amount: v.totalValuationDzd,
        currency: 'DZD',
        status: v.reason,
        dateStr: v.date || v.createdAt,
        branchId: v.branchId,
      });
    });
    return out;
  }, [commercialDocs, purchaseDocs, stockVouchers]);

  const stats = useMemo(() => {
    const salesCount = allItems.filter((i) => i.group === 'sales_b2b').length;
    const purchCount = allItems.filter((i) => i.group === 'purchases_depot').length;
    const salesVol = (commercialDocs || []).reduce((s, d) => s + (d.netToPay || 0), 0);
    const branchCounts = new Map<string, number>();
    allItems.forEach((it) => {
      const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalCount: allItems.length,
      salesCount,
      purchCount,
      salesVol,
      branchOptions: Array.from(branchCounts.entries()).map(([name, count]) => ({ value: name, label: name, count })),
    };
  }, [allItems, commercialDocs, branchesById, currentBranch, language]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((it) => {
      if (statusFilter === 'sales_b2b' && it.group !== 'sales_b2b') return false;
      if (statusFilter === 'purchases_depot' && it.group !== 'purchases_depot') return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const hay = `${it.docNumber} ${it.partnerName} ${it.depotName} ${it.kindLabel} ${it.status}`.toLowerCase();
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
      if (sortBy === 'amount') return (a.amount - b.amount) * sign;
      return (new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()) * sign;
    });
  }, [filteredItems, pinnedIds, sortBy, sortDir]);

  const columns = useMemo<ColumnDefinition<TradingLedgerItem>[]>(
    () => [
      {
        key: 'doc',
        header: l3('الوثيقة والشريك', 'Document & Tiers', 'Document & Partner'),
        sortable: true,
        renderCell: (it) => (
          <div className="min-w-0">
            <span className="t-label font-semibold text-black dark:text-white truncate block">{it.docNumber}</span>
            <span className="t-cap text-black/62 dark:text-white/65 truncate block">{it.partnerName} · {it.kindLabel}</span>
          </div>
        ),
      },
      {
        key: 'depot',
        header: l3('المستودع', 'Dépôt', 'Warehouse'),
        renderCell: (it) => <span className="t-small text-black/80 dark:text-white/80 truncate block">{it.depotName}</span>,
      },
      {
        key: 'amount',
        header: l3('المبلغ الصافي', 'Montant TTC / Net', 'Net Amount'),
        sortable: true,
        renderCell: (it) => (
          <div className="tabular-nums">
            <span className="t-label font-semibold text-black dark:text-white block">{formatMoney(it.amount, it.currency)}</span>
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
    <VerticalHistoryScaffold<TradingLedgerItem>
      icon={<History size={22} />}
      title={l3('سجل التجارة والجملة', 'Historique Négoce & Dépôts', 'B2B Trading History')}
      primaryAction={{
        label: l3('المبيعات B2B', 'Ventes B2B', 'B2B Sales'),
        icon: <FileText size={16} />,
        onClick: () => setScreen('trading_sales'),
      }}
      kpiHeading={l3('تدقيق الفواتير والمشتريات والمستودعات', 'Audit Ventes B2B, Achats & Dépôts', 'Sales, Purchases & Depots Audit')}
      primaryCard={{
        label: l3('وثائق البيع B2B', 'Ventes & Factures B2B', 'B2B Sales Docs'),
        badgeText: `${stats.salesCount} docs`,
        count: stats.salesCount,
        tone: 'emerald',
        isActive: statusFilter === 'sales_b2b',
        onToggle: () => setStatusFilter((p) => (p === 'sales_b2b' ? 'all' : 'sales_b2b')),
      }}
      secondaryCard={{
        label: l3('المشتريات والتحويلات', 'Achats & Bons Dépôt', 'Purchases & Vouchers'),
        badgeText: `${stats.purchCount} bons`,
        count: stats.purchCount,
        tone: 'terracotta',
        isActive: statusFilter === 'purchases_depot',
        onToggle: () => setStatusFilter((p) => (p === 'purchases_depot' ? 'all' : 'purchases_depot')),
      }}
      darkCard={{
        label: l3('حجم المبيعات المفوترة', 'Volume Commercial B2B', 'Commercial Volume'),
        badgePrefix: '',
        badgeCount: stats.totalCount,
        badgeSuffix: l3('وثائق', 'pièces', 'docs'),
        valuePrefix: '',
        valueCount: stats.salesVol,
        formatValue: (n) => formatMoney(n),
        caption: `${currentBranch?.name || 'Centrale'} · Trading Audit`,
      }}
      podTitle={l3('أرشيف المعاملات والمستودعات', 'Registre Commercial & Mouvements', 'Commercial & Depot Ledger')}
      searchPlaceholder={l3('بحث برقم الوثيقة، الشريك، المستودع...', 'Rechercher N° pièce, client, fournisseur, dépôt...', 'Search doc #, partner, depot...')}
      vertical="trading_commercial"
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
        { value: 'sales_b2b', label: l3('المبيعات B2B', 'Ventes B2B', 'B2B Sales'), count: stats.salesCount },
        { value: 'purchases_depot', label: l3('المشتريات والمخازن', 'Achats & Dépôts', 'Purchases & Depots'), count: stats.purchCount },
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
        subline: `${it.kindLabel} · ${it.partnerName} · ${it.depotName}`,
        categoryLabel: it.kindLabel,
        statusLabel: it.status,
        statusVariant: it.group === 'sales_b2b' ? 'active' : 'warning',
        metricPrimary: formatMoney(it.amount, it.currency),
        metricSecondary: new Date(it.dateStr).toLocaleDateString(),
        detailCol1: { heading: l3('الوثيقة', 'Pièce', 'Doc'), primaryText: it.docNumber, secondaryText: it.kindLabel },
        detailCol2: { heading: l3('الشريك والمخزن', 'Tiers & Dépôt', 'Partner & Depot'), primaryText: it.partnerName, secondaryText: it.depotName },
        detailCol3: { heading: l3('المبلغ', 'Montant', 'Amount'), primaryText: formatMoney(it.amount, it.currency), secondaryText: it.status },
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
          `atrium-trading-history-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Type', 'Doc #', 'Partner', 'Depot', 'Amount', 'Currency', 'Status', 'Date'],
          sortedItems.map((i) => [i.kindLabel, i.docNumber, i.partnerName, i.depotName, i.amount, i.currency, i.status, i.dateStr])
        )
      }
      entityPluralLabel={l3('وثائق', 'pièces', 'documents')}
      emptyTitle={l3('لا توجد معاملات تجارية', 'Aucun historique négoce', 'No trading history yet')}
      emptyDescription={l3('ستظهر الفواتير وطلبات الشراء وسندات المخزن هنا', 'Les factures B2B, achats et bons de dépôt apparaîtront ici.', 'B2B sales, purchases, and depot vouchers appear here.')}
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      inspectorConfig={{
        title: (it) => it.docNumber,
        subtitle: (it) => `${it.kindLabel} · ${it.partnerName}`,
        categoryLabel: (it) => it.kindLabel,
        statusLabel: (it) => it.status,
        renderBody: (it) => (
          <InspectorSection index={0} title={l3('تفاصيل الوثيقة', 'Détails Pièce Commerciale', 'Document Details')}>
            <InspectorCard>
              <InspectorKeyValue label={l3('النوع', 'Type', 'Type')} value={it.kindLabel} />
              <InspectorKeyValue label={l3('الرقم', 'Numéro', 'Number')} value={it.docNumber} mono />
              <InspectorKeyValue label={l3('الشريك', 'Client / Fournisseur', 'Partner')} value={it.partnerName} />
              <InspectorKeyValue label={l3('المستودع', 'Dépôt', 'Depot')} value={it.depotName} />
              <InspectorKeyValue label={l3('المبلغ', 'Montant', 'Amount')} value={formatMoney(it.amount, it.currency)} mono />
              <InspectorKeyValue label={l3('الحالة', 'Statut', 'Status')} value={it.status} />
            </InspectorCard>
          </InspectorSection>
        ),
      }}
    />
  );
});
