import React, { useMemo, useState } from 'react';
import { History, Sprout, Eye } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useAgricultureData } from './agricultureData';
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

interface AgriLedgerItem {
  id: string;
  group: 'harvest_scale' | 'dairy_crops';
  kindLabel: string;
  title: string;
  actorOrParcel: string;
  metricText: string;
  amountDzd: number;
  status: string;
  dateStr: string;
  branchId?: string;
}

export const AgricultureHistoryView: React.FC = React.memo(() => {
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
  const { pointages, weighbridgeTickets, milkingRecords, cropCycles } = useAgricultureData();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const l3 = (ar: string, fr: string, en: string) => (isAr ? ar : isEn ? en : fr);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [selectedItem, setSelectedItem] = useState<AgriLedgerItem | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const allItems = useMemo<AgriLedgerItem[]>(() => {
    const out: AgriLedgerItem[] = [];
    (weighbridgeTickets || []).forEach((w) => {
      out.push({
        id: `wb_${w.id}`,
        group: 'harvest_scale',
        kindLabel: l3('تذكرة ميزان', 'Pont-Bascule', 'Weighbridge'),
        title: w.ticketNumber,
        actorOrParcel: `${w.buyerName} · ${w.cropDesignation}`,
        metricText: `${w.netWeightKg.toLocaleString()} kg`,
        amountDzd: w.totalAmountDzd || 0,
        status: w.paymentMethod,
        dateStr: w.date || w.createdAt,
        branchId: w.branchId,
      });
    });
    (pointages || []).forEach((p) => {
      out.push({
        id: `pt_${p.id}`,
        group: 'harvest_scale',
        kindLabel: l3('يومية عمال', 'Pointage Cueillette', 'Harvest Pointage'),
        title: p.workerName,
        actorOrParcel: p.parcelName || 'Parcelle',
        metricText: `${p.cratesCollected} ${l3('صناديق', 'caisses', 'crates')}`,
        amountDzd: p.netDueDzd || p.calculatedWageDzd || 0,
        status: p.isPaid ? l3('مدفوع', 'Payé', 'Paid') : l3('مستحق', 'Dû', 'Due'),
        dateStr: p.date || p.createdAt,
        branchId: p.branchId,
      });
    });
    (milkingRecords || []).forEach((m) => {
      out.push({
        id: `mlk_${m.id}`,
        group: 'dairy_crops',
        kindLabel: l3('جمع الحليب ONIL', 'Collecte Lait', 'Milking'),
        title: `${m.sessionPeriod === 'morning' ? l3('الصباح', 'Matin', 'Morning') : l3('المساء', 'Soir', 'Evening')} · ${m.destinationDairy}`,
        actorOrParcel: `${m.conformingLiters}/${m.totalTankLiters} L`,
        metricText: `${m.conformingLiters} L`,
        amountDzd: m.onilTotalSubsidyDzd || 0,
        status: 'ONIL',
        dateStr: m.sessionDate || m.createdAt,
        branchId: m.branchId,
      });
    });
    (cropCycles || []).forEach((c) => {
      out.push({
        id: `cyc_${c.id}`,
        group: 'dairy_crops',
        kindLabel: l3('دورة زراعية', 'Cycle Cultural', 'Crop Cycle'),
        title: `${c.cropName} (${c.variety})`,
        actorOrParcel: `${c.surfaceAllocatedHa} Ha · ${c.campaignYear}`,
        metricText: `${c.projectedYieldQtx} Qtx`,
        amountDzd: (c.totalInputCostDzd || 0) + (c.totalLaborCostDzd || 0),
        status: c.currentPhase,
        dateStr: c.sowingDate || c.createdAt,
        branchId: c.branchId,
      });
    });
    return out;
  }, [weighbridgeTickets, pointages, milkingRecords, cropCycles, isAr, isEn]);

  const stats = useMemo(() => {
    const harvestCount = allItems.filter((i) => i.group === 'harvest_scale').length;
    const dairyCropsCount = allItems.filter((i) => i.group === 'dairy_crops').length;
    const totalSalesDzd = (weighbridgeTickets || []).reduce((s, w) => s + (w.totalAmountDzd || 0), 0);
    const branchCounts = new Map<string, number>();
    allItems.forEach((it) => {
      const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalCount: allItems.length,
      harvestCount,
      dairyCropsCount,
      totalSalesDzd,
      branchOptions: Array.from(branchCounts.entries()).map(([name, count]) => ({ value: name, label: name, count })),
    };
  }, [allItems, weighbridgeTickets, branchesById, currentBranch, language]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((it) => {
      if (statusFilter === 'harvest_scale' && it.group !== 'harvest_scale') return false;
      if (statusFilter === 'dairy_crops' && it.group !== 'dairy_crops') return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const hay = `${it.title} ${it.actorOrParcel} ${it.metricText} ${it.kindLabel}`.toLowerCase();
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
      if (sortBy === 'amount') return (a.amountDzd - b.amountDzd) * sign;
      return (new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()) * sign;
    });
  }, [filteredItems, pinnedIds, sortBy, sortDir]);

  const columns = useMemo<ColumnDefinition<AgriLedgerItem>[]>(
    () => [
      {
        key: 'title',
        header: l3('العملية والمحصول', 'Opération & Culture', 'Operation & Crop'),
        sortable: true,
        renderCell: (it) => (
          <div className="min-w-0">
            <span className="t-label font-semibold text-black dark:text-white truncate block">{it.title}</span>
            <span className="t-cap text-black/62 dark:text-white/65 truncate block">{it.kindLabel} · {it.actorOrParcel}</span>
          </div>
        ),
      },
      {
        key: 'metric',
        header: l3('الكمية / الوزن', 'Volume / Poids', 'Volume / Weight'),
        renderCell: (it) => <span className="t-small font-medium tabular-nums text-black/80 dark:text-white/80">{it.metricText}</span>,
      },
      {
        key: 'amount',
        header: l3('القيمة والتاريخ', 'Valeur & Date', 'Value & Date'),
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
        header: l3('الحالة', 'Statut', 'Status'),
        renderCell: (it) => <span className="t-small font-semibold text-[var(--facility-accent,var(--brand-text))]">{it.status}</span>,
      },
    ],
    [isAr, isEn]
  );

  return (
    <VerticalHistoryScaffold<AgriLedgerItem>
      icon={<History size={22} />}
      title={l3('سجل المزرعة والحصاد', 'Historique Ferme & Bascule', 'Agriculture History')}
      primaryAction={{
        label: l3('الميزان والتسويق', 'Bascule & Gros', 'Weighbridge'),
        icon: <Sprout size={16} />,
        onClick: () => setScreen('finance'),
      }}
      kpiHeading={l3('تدقيق الحصاد والميزان والحليب والمحاصيل', 'Audit Récoltes, Pont-Bascule, Lait & Cultures', 'Harvest, Dairy & Crops Audit')}
      primaryCard={{
        label: l3('الحصاد والميزان', 'Récoltes & Bascule', 'Harvest & Scale'),
        badgeText: `${stats.harvestCount} tickets`,
        count: stats.harvestCount,
        tone: 'emerald',
        isActive: statusFilter === 'harvest_scale',
        onToggle: () => setStatusFilter((p) => (p === 'harvest_scale' ? 'all' : 'harvest_scale')),
      }}
      secondaryCard={{
        label: l3('الحليب والمحاصيل', 'Lait ONIL & Cultures', 'Dairy & Crops'),
        badgeText: `${stats.dairyCropsCount} relevés`,
        count: stats.dairyCropsCount,
        tone: 'terracotta',
        isActive: statusFilter === 'dairy_crops',
        onToggle: () => setStatusFilter((p) => (p === 'dairy_crops' ? 'all' : 'dairy_crops')),
      }}
      darkCard={{
        label: l3('مبيعات الميزان بالجملة', 'Ventes Pont-Bascule', 'Weighbridge Sales'),
        badgePrefix: '',
        badgeCount: stats.totalCount,
        badgeSuffix: l3('سجلات', 'opérations', 'entries'),
        valuePrefix: '',
        valueCount: stats.totalSalesDzd,
        formatValue: (n) => formatMoney(n),
        caption: `${currentBranch?.name || 'Exploitation'} · Loi 10-03 & ONIL`,
      }}
      podTitle={l3('سجل الاستغلال الفلاحي', 'Registre Récoltes, Lait & Cultures', 'Farm & Weighbridge Ledger')}
      searchPlaceholder={l3('بحث عن تذكرة، عامل، محصول، ألبان...', 'Rechercher ticket, ouvrier, culture, laiterie...', 'Search ticket, worker, crop, dairy...')}
      vertical="agriculture_farming"
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
        { value: 'harvest_scale', label: l3('الحصاد والميزان', 'Récoltes & Bascule', 'Harvest & Scale'), count: stats.harvestCount },
        { value: 'dairy_crops', label: l3('الحليب والمحاصيل', 'Lait & Cultures', 'Dairy & Crops'), count: stats.dairyCropsCount },
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
        subline: `${it.kindLabel} · ${it.actorOrParcel} · ${it.metricText}`,
        categoryLabel: it.kindLabel,
        statusLabel: it.status,
        statusVariant: it.group === 'harvest_scale' ? 'active' : 'warning',
        metricPrimary: it.amountDzd > 0 ? formatMoney(it.amountDzd) : it.metricText,
        metricSecondary: new Date(it.dateStr).toLocaleDateString(),
        detailCol1: { heading: l3('النوع', 'Type', 'Type'), primaryText: it.kindLabel, secondaryText: it.title },
        detailCol2: { heading: l3('القطعة / المشتري', 'Parcelle / Tiers', 'Parcel / Buyer'), primaryText: it.actorOrParcel, secondaryText: it.metricText },
        detailCol3: { heading: l3('القيمة', 'Montant', 'Amount'), primaryText: it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—', secondaryText: it.status },
      })}
      getFanActions={(it) => [
        { id: 'view', label: l3('التفاصيل', 'Détails', 'Inspect'), icon: <Eye className="w-[15px] h-[15px]" />, onClick: () => setSelectedItem(it) },
      ]}
      filterSections={
        stats.branchOptions.length > 0
          ? [{
              id: 'branch',
              label: l3('المزرعة', 'Domaine / Site', 'Site'),
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
          `atrium-agriculture-history-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Type', 'Title', 'Parcel/Buyer', 'Metric', 'Amount DZD', 'Status', 'Date'],
          sortedItems.map((i) => [i.kindLabel, i.title, i.actorOrParcel, i.metricText, i.amountDzd, i.status, i.dateStr])
        )
      }
      entityPluralLabel={l3('سجلات', 'relevés', 'records')}
      emptyTitle={l3('لا توجد سجلات فلاحية', 'Aucun historique agricole', 'No farm history yet')}
      emptyDescription={l3('ستظهر تذاكر الميزان والعمال والحليب والمحاصيل هنا', 'Les tickets bascule, pointages, collectes lait et cycles apparaîtront ici.', 'Weighbridge tickets, pointages, milking, and crop cycles appear here.')}
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      inspectorConfig={{
        title: (it) => it.title,
        subtitle: (it) => `${it.kindLabel} · ${it.actorOrParcel}`,
        categoryLabel: (it) => it.kindLabel,
        statusLabel: (it) => it.status,
        renderBody: (it) => (
          <InspectorSection index={0} title={l3('تفاصيل السجل الفلاحي', 'Détails Agricole', 'Farm Record Details')}>
            <InspectorCard>
              <InspectorKeyValue label={l3('النوع', 'Type', 'Type')} value={it.kindLabel} />
              <InspectorKeyValue label={l3('العنوان', 'Référence', 'Title')} value={it.title} />
              <InspectorKeyValue label={l3('التفاصيل', 'Parcelle / Tiers', 'Parcel / Buyer')} value={it.actorOrParcel} />
              <InspectorKeyValue label={l3('المقياس', 'Poids / Volume', 'Metric')} value={it.metricText} mono />
              <InspectorKeyValue label={l3('القيمة', 'Montant', 'Amount')} value={it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—'} mono />
              <InspectorKeyValue label={l3('الحالة', 'Statut', 'Status')} value={it.status} />
            </InspectorCard>
          </InspectorSection>
        ),
      }}
    />
  );
});
