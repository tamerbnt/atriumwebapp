import React, { useMemo, useState } from 'react';
import { History, Factory, Eye } from 'lucide-react';
import {
  useAtriumSelector,
  shallowEqualObjects,
  selectCurrentBranchFromState,
  useAtriumActions,
} from '../../../services/store';
import { useManufacturingData } from './manufacturingData';
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

interface MfgLedgerItem {
  id: string;
  group: 'orders_of' | 'qc_materials';
  kindLabel: string;
  docNumber: string;
  productOrActor: string;
  detailText: string;
  amountDzd: number;
  status: string;
  dateStr: string;
  branchId?: string;
}

export const ManufacturingHistoryView: React.FC = React.memo(() => {
  const { branches, currentBusinessId, currentBranchId, currentBranch, language, isSyncing, networkMode, isSyncTimeout, lastSyncedAt } = useAtriumSelector(
    (s) => ({
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
  const { orders, qcRecords, vouchers } = useManufacturingData();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const l3 = (ar: string, fr: string, en: string) => (isAr ? ar : isEn ? en : fr);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [selectedItem, setSelectedItem] = useState<MfgLedgerItem | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const allItems = useMemo<MfgLedgerItem[]>(() => {
    const out: MfgLedgerItem[] = [];
    (orders || []).forEach((o) => {
      out.push({
        id: `of_${o.id}`,
        group: 'orders_of',
        kindLabel: l3('أمر تصنيع OF', 'Ordre OF', 'Production Order'),
        docNumber: o.orderNumber,
        productOrActor: o.productName,
        detailText: `${o.batchLotNumber} · ${o.actualQuantityProduced ?? 0}/${o.targetQuantity} u.`,
        amountDzd: o.totalCostDzd || 0,
        status: o.status,
        dateStr: o.startDate || o.createdAt,
        branchId: o.branchId,
      });
    });
    (qcRecords || []).forEach((q) => {
      out.push({
        id: `qc_${q.id}`,
        group: 'qc_materials',
        kindLabel: l3('رقابة جودة QC', 'Contrôle QC', 'QC Inspection'),
        docNumber: q.inspectionNumber,
        productOrActor: q.productName,
        detailText: `${q.inspectorName} · ${q.acceptedQuantity}/${q.inspectedQuantity} OK`,
        amountDzd: 0,
        status: q.verdict,
        dateStr: q.inspectionDate,
        branchId: q.branchId,
      });
    });
    (vouchers || []).forEach((v) => {
      out.push({
        id: `matv_${v.id}`,
        group: 'qc_materials',
        kindLabel: v.voucherType,
        docNumber: v.voucherNumber,
        productOrActor: v.recipientStaffName,
        detailText: `${v.orderNumber || 'Atelier'} · ${v.items.length} ${l3('مواد', 'matières', 'items')}`,
        amountDzd: v.totalValueDzd || 0,
        status: v.voucherType,
        dateStr: v.transferDate,
        branchId: v.branchId,
      });
    });
    return out;
  }, [orders, qcRecords, vouchers, isAr, isEn]);

  const stats = useMemo(() => {
    const ofCount = allItems.filter((i) => i.group === 'orders_of').length;
    const qcMatCount = allItems.filter((i) => i.group === 'qc_materials').length;
    const totalCostDzd = (orders || []).reduce((s, o) => s + (o.totalCostDzd || 0), 0);
    const branchCounts = new Map<string, number>();
    allItems.forEach((it) => {
      const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalCount: allItems.length,
      ofCount,
      qcMatCount,
      totalCostDzd,
      branchOptions: Array.from(branchCounts.entries()).map(([name, count]) => ({ value: name, label: name, count })),
    };
  }, [allItems, orders, branchesById, currentBranch, language]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((it) => {
      if (statusFilter === 'orders_of' && it.group !== 'orders_of') return false;
      if (statusFilter === 'qc_materials' && it.group !== 'qc_materials') return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const hay = `${it.docNumber} ${it.productOrActor} ${it.detailText} ${it.kindLabel}`.toLowerCase();
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

  const columns = useMemo<ColumnDefinition<MfgLedgerItem>[]>(
    () => [
      {
        key: 'doc',
        header: l3('الأمر / الوثيقة', 'N° OF / Pièce', 'Order / Ref'),
        sortable: true,
        renderCell: (it) => (
          <div className="min-w-0">
            <span className="t-label font-semibold text-black dark:text-white truncate block">{it.docNumber}</span>
            <span className="t-cap text-black/62 dark:text-white/65 truncate block">{it.kindLabel} · {it.productOrActor}</span>
          </div>
        ),
      },
      {
        key: 'detail',
        header: l3('الدفعة والكميات', 'Lot & Quantités', 'Lot & Metrics'),
        renderCell: (it) => <span className="t-small text-black/80 dark:text-white/80 truncate block">{it.detailText}</span>,
      },
      {
        key: 'amount',
        header: l3('التكلفة والتاريخ', 'Coût & Date', 'Cost & Date'),
        sortable: true,
        renderCell: (it) => (
          <div className="tabular-nums">
            <span className="t-label font-semibold text-black dark:text-white block">
              {it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—'}
            </span>
            <span className="t-cap text-black/60 dark:text-white/60 block">{new Date(it.dateStr).toLocaleDateString()}</span>
          </div>
        ),
      },
      {
        key: 'status',
        header: l3('الحالة', 'Verdict / Statut', 'Status'),
        renderCell: (it) => <span className="t-small font-semibold text-[var(--facility-accent,var(--brand-text))]">{it.status}</span>,
      },
    ],
    [isAr, isEn]
  );

  return (
    <VerticalHistoryScaffold<MfgLedgerItem>
      icon={<History size={22} />}
      title={l3('سجل التصنيع والجودة', 'Historique Usine & Production', 'Manufacturing History')}
      primaryAction={{
        label: l3('أوامر التصنيع', 'Ordres OF', 'Production Orders'),
        icon: <Factory size={16} />,
        onClick: () => setScreen('scheduler'),
      }}
      kpiHeading={l3('تدقيق أوامر التصنيع والجودة والمواد', 'Audit Ordres OF, Contrôle QC & Matières', 'Production & QC Audit')}
      primaryCard={{
        label: l3('أوامر التصنيع OF', 'Ordres de Fabrication', 'Production Orders'),
        badgeText: `${stats.ofCount} OF`,
        count: stats.ofCount,
        tone: 'emerald',
        isActive: statusFilter === 'orders_of',
        onToggle: () => setStatusFilter((p) => (p === 'orders_of' ? 'all' : 'orders_of')),
      }}
      secondaryCard={{
        label: l3('الجودة والمواد', 'QC & Bons Matières', 'QC & Materials'),
        badgeText: `${stats.qcMatCount} contrôles`,
        count: stats.qcMatCount,
        tone: 'terracotta',
        isActive: statusFilter === 'qc_materials',
        onToggle: () => setStatusFilter((p) => (p === 'qc_materials' ? 'all' : 'qc_materials')),
      }}
      darkCard={{
        label: l3('تكلفة الإنتاج الإجمالية', 'Coût Production Cumulé', 'Cumulative Production Cost'),
        badgePrefix: '',
        badgeCount: stats.totalCount,
        badgeSuffix: l3('سجلات', 'mouvements', 'entries'),
        valuePrefix: '',
        valueCount: stats.totalCostDzd,
        formatValue: (n) => formatMoney(n),
        caption: `${currentBranch?.name || 'Usine'} · Traçabilité Lots`,
      }}
      podTitle={l3('أرشيف الإنتاج والجودة', 'Registre OF, QC & Bons Matières', 'Manufacturing & QC Ledger')}
      searchPlaceholder={l3('بحث برقم الأمر، المنتج، الدفعة...', 'Rechercher N° OF, produit, lot, QC...', 'Search OF #, product, lot, QC...')}
      vertical="manufacturing_production"
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
        { value: 'orders_of', label: l3('أوامر OF', 'Ordres OF', 'Orders OF'), count: stats.ofCount },
        { value: 'qc_materials', label: l3('الجودة والمواد', 'QC & Matières', 'QC & Materials'), count: stats.qcMatCount },
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
        subline: `${it.kindLabel} · ${it.productOrActor} · ${it.detailText}`,
        categoryLabel: it.kindLabel,
        statusLabel: it.status,
        statusVariant: it.group === 'orders_of' ? 'active' : 'warning',
        metricPrimary: it.amountDzd > 0 ? formatMoney(it.amountDzd) : it.status,
        metricSecondary: new Date(it.dateStr).toLocaleDateString(),
        detailCol1: { heading: l3('الوثيقة', 'Pièce', 'Doc'), primaryText: it.docNumber, secondaryText: it.kindLabel },
        detailCol2: { heading: l3('المنتج والدفعة', 'Produit / Lot', 'Product / Lot'), primaryText: it.productOrActor, secondaryText: it.detailText },
        detailCol3: { heading: l3('التكلفة', 'Coût', 'Cost'), primaryText: it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—', secondaryText: it.status },
      })}
      getFanActions={(it) => [
        { id: 'view', label: l3('التفاصيل', 'Détails', 'Inspect'), icon: <Eye className="w-[15px] h-[15px]" />, onClick: () => setSelectedItem(it) },
      ]}
      filterSections={
        stats.branchOptions.length > 0
          ? [{
              id: 'branch',
              label: l3('الموقع', 'Site / Atelier', 'Site'),
              value: branchFilter,
              onChange: setBranchFilter,
              kind: 'tiles',
              columns: 2,
              options: [{ value: 'All', label: l3('كل المواقع', 'Tous', 'All Sites'), count: allItems.length }, ...stats.branchOptions],
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
          `atrium-manufacturing-history-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Type', 'Doc #', 'Product/Staff', 'Details', 'Cost DZD', 'Status', 'Date'],
          sortedItems.map((i) => [i.kindLabel, i.docNumber, i.productOrActor, i.detailText, i.amountDzd, i.status, i.dateStr])
        )
      }
      entityPluralLabel={l3('سجلات', 'enregistrements', 'records')}
      emptyTitle={l3('لا توجد عمليات تصنيع', 'Aucun historique usine', 'No manufacturing history yet')}
      emptyDescription={l3('ستظهر أوامر التصنيع وفحوصات الجودة وسندات المواد هنا', 'Les ordres OF, fiches QC et bons matières apparaîtront ici.', 'Production orders, QC inspections, and material vouchers appear here.')}
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      inspectorConfig={{
        title: (it) => it.docNumber,
        subtitle: (it) => `${it.kindLabel} · ${it.productOrActor}`,
        categoryLabel: (it) => it.kindLabel,
        statusLabel: (it) => it.status,
        renderBody: (it) => (
          <InspectorSection index={0} title={l3('تفاصيل السجل الصناعي', 'Détails Production', 'Production Record')}>
            <InspectorCard>
              <InspectorKeyValue label={l3('النوع', 'Type', 'Type')} value={it.kindLabel} />
              <InspectorKeyValue label={l3('الرقم', 'Référence', 'Number')} value={it.docNumber} mono />
              <InspectorKeyValue label={l3('المنتج / المعني', 'Produit / Opérateur', 'Product / Staff')} value={it.productOrActor} />
              <InspectorKeyValue label={l3('التفاصيل', 'Lot & Quantités', 'Lot & Metrics')} value={it.detailText} />
              <InspectorKeyValue label={l3('التكلفة', 'Valorisation', 'Value')} value={it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—'} mono />
              <InspectorKeyValue label={l3('الحالة', 'Statut', 'Status')} value={it.status} />
            </InspectorCard>
          </InspectorSection>
        ),
      }}
    />
  );
});
