import React, { useMemo, useState } from 'react';
import { History, Truck, Eye } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useLogisticsData } from './logisticsData';
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

interface LogisticsLedgerItem {
  id: string;
  group: 'parcels_runs' | 'bags_cod';
  kindLabel: string;
  code: string;
  primaryTitle: string;
  routeOrDetail: string;
  amountDzd: number;
  status: string;
  dateStr: string;
  branchId?: string;
}

export const LogisticsHistoryView: React.FC = React.memo(() => {
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
  const { shipments, manifests, bags, remittances } = useLogisticsData();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const l3 = (ar: string, fr: string, en: string) => (isAr ? ar : isEn ? en : fr);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [selectedItem, setSelectedItem] = useState<LogisticsLedgerItem | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const allItems = useMemo<LogisticsLedgerItem[]>(() => {
    const out: LogisticsLedgerItem[] = [];
    (shipments || []).forEach((s) => {
      out.push({
        id: `shp_${s.id}`,
        group: 'parcels_runs',
        kindLabel: l3('طرد COD', 'Colis', 'Shipment'),
        code: s.trackingCode,
        primaryTitle: s.recipientName,
        routeOrDetail: `${s.merchantName} → Wilaya ${s.destinationWilaya}`,
        amountDzd: s.codAmountDzd || 0,
        status: s.status,
        dateStr: s.createdAt,
        branchId: s.branchId,
      });
    });
    (manifests || []).forEach((m) => {
      out.push({
        id: `man_${m.id}`,
        group: 'parcels_runs',
        kindLabel: l3('رحلة توزيع', 'Tournée LVR', 'Manifest'),
        code: m.manifestNumber,
        primaryTitle: m.driverName,
        routeOrDetail: `${m.zoneWilaya} · ${m.totalShipmentsCount} ${l3('طرود', 'colis', 'parcels')}`,
        amountDzd: m.totalCodExpectedDzd || 0,
        status: m.status,
        dateStr: m.dispatchDate || m.createdAt,
        branchId: m.branchId,
      });
    });
    (bags || []).forEach((b) => {
      out.push({
        id: `bag_${b.id}`,
        group: 'bags_cod',
        kindLabel: l3('كيس مختوم', 'Sac-Navette', 'Transport Bag'),
        code: b.bagCode,
        primaryTitle: `Scellé #${b.securitySealNumber}`,
        routeOrDetail: `W${b.originHubWilaya} → W${b.destinationHubWilaya} (${b.totalItemCount} u.)`,
        amountDzd: 0,
        status: b.status,
        dateStr: b.receivedAt || b.sealedAt || new Date().toISOString(),
        branchId: b.branchId,
      });
    });
    (remittances || []).forEach((r) => {
      out.push({
        id: `rem_${r.id}`,
        group: 'bags_cod',
        kindLabel: l3('تحويل تاجر', 'Virement COD', 'COD Remittance'),
        code: r.batchNumber,
        primaryTitle: r.merchantName,
        routeOrDetail: r.paymentChannel,
        amountDzd: r.netPayoutDzd || 0,
        status: r.status,
        dateStr: r.executedAt || new Date().toISOString(),
        branchId: r.branchId,
      });
    });
    return out;
  }, [shipments, manifests, bags, remittances, isAr, isEn]);

  const stats = useMemo(() => {
    const parcelsCount = allItems.filter((i) => i.group === 'parcels_runs').length;
    const bagsCodCount = allItems.filter((i) => i.group === 'bags_cod').length;
    const codTotalDzd = (shipments || []).reduce((s, x) => s + (x.codAmountDzd || 0), 0);
    const branchCounts = new Map<string, number>();
    allItems.forEach((it) => {
      const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalCount: allItems.length,
      parcelsCount,
      bagsCodCount,
      codTotalDzd,
      branchOptions: Array.from(branchCounts.entries()).map(([name, count]) => ({ value: name, label: name, count })),
    };
  }, [allItems, shipments, branchesById, currentBranch, language]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((it) => {
      if (statusFilter === 'parcels_runs' && it.group !== 'parcels_runs') return false;
      if (statusFilter === 'bags_cod' && it.group !== 'bags_cod') return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const hay = `${it.code} ${it.primaryTitle} ${it.routeOrDetail} ${it.kindLabel}`.toLowerCase();
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
      if (sortBy === 'code') return a.code.localeCompare(b.code) * sign;
      if (sortBy === 'amount') return (a.amountDzd - b.amountDzd) * sign;
      return (new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()) * sign;
    });
  }, [filteredItems, pinnedIds, sortBy, sortDir]);

  const columns = useMemo<ColumnDefinition<LogisticsLedgerItem>[]>(
    () => [
      {
        key: 'code',
        header: l3('الرمز والمستلم', 'Tracking & Destinataire', 'Tracking & Recipient'),
        sortable: true,
        renderCell: (it) => (
          <div className="min-w-0">
            <span className="t-label font-semibold text-black dark:text-white truncate block">{it.code}</span>
            <span className="t-cap text-black/62 dark:text-white/65 truncate block">{it.kindLabel} · {it.primaryTitle}</span>
          </div>
        ),
      },
      {
        key: 'route',
        header: l3('المسار / التاجر', 'Itinéraire / Canal', 'Route / Channel'),
        renderCell: (it) => <span className="t-small text-black/80 dark:text-white/80 truncate block">{it.routeOrDetail}</span>,
      },
      {
        key: 'amount',
        header: l3('التحصيل COD', 'Montant COD & Date', 'COD & Date'),
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
    <VerticalHistoryScaffold<LogisticsLedgerItem>
      icon={<History size={22} />}
      title={l3('سجل الطرود والتوصيل', 'Historique Logistique & COD', 'Logistics & Delivery History')}
      primaryAction={{
        label: l3('الطرود', 'Colis', 'Shipments'),
        icon: <Truck size={16} />,
        onClick: () => setScreen('members'),
      }}
      kpiHeading={l3('تدقيق الطرود والرحلات والتحصيل COD', 'Audit Colis, Tournées LVR & Virements COD', 'Parcels, Runs & COD Audit')}
      primaryCard={{
        label: l3('الطرود والرحلات', 'Colis & Tournées', 'Parcels & Runs'),
        badgeText: `${stats.parcelsCount} envois`,
        count: stats.parcelsCount,
        tone: 'emerald',
        isActive: statusFilter === 'parcels_runs',
        onToggle: () => setStatusFilter((p) => (p === 'parcels_runs' ? 'all' : 'parcels_runs')),
      }}
      secondaryCard={{
        label: l3('الأكياس والتحويلات', 'Sacs-Navette & COD', 'Bags & Remittances'),
        badgeText: `${stats.bagsCodCount} lots`,
        count: stats.bagsCodCount,
        tone: 'terracotta',
        isActive: statusFilter === 'bags_cod',
        onToggle: () => setStatusFilter((p) => (p === 'bags_cod' ? 'all' : 'bags_cod')),
      }}
      darkCard={{
        label: l3('إجمالي مبالغ COD', 'Volume COD Suivi', 'Tracked COD Volume'),
        badgePrefix: '',
        badgeCount: stats.totalCount,
        badgeSuffix: l3('حركات', 'mouvements', 'movements'),
        valuePrefix: '',
        valueCount: stats.codTotalDzd,
        formatValue: (n) => formatMoney(n),
        caption: `${currentBranch?.name || 'Hub'} · 58 Wilayas`,
      }}
      podTitle={l3('سجل الطرود والتحصيل', 'Registre Expéditions, Sacs & COD', 'Logistics Audit Ledger')}
      searchPlaceholder={l3('بحث برمز التتبع، الولاية، التاجر...', 'Rechercher tracking, wilaya, livreur, lot COD...', 'Search tracking, wilaya, driver...')}
      vertical="logistics_delivery"
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
        { value: 'parcels_runs', label: l3('الطرود والرحلات', 'Colis & Tournées', 'Parcels & Runs'), count: stats.parcelsCount },
        { value: 'bags_cod', label: l3('الأكياس وCOD', 'Sacs & COD', 'Bags & COD'), count: stats.bagsCodCount },
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
        title: it.code,
        subline: `${it.kindLabel} · ${it.primaryTitle} · ${it.routeOrDetail}`,
        categoryLabel: it.kindLabel,
        statusLabel: it.status,
        statusVariant: it.group === 'parcels_runs' ? 'active' : 'warning',
        metricPrimary: it.amountDzd > 0 ? formatMoney(it.amountDzd) : it.status,
        metricSecondary: new Date(it.dateStr).toLocaleDateString(),
        detailCol1: { heading: l3('المرجع', 'Code', 'Code'), primaryText: it.code, secondaryText: it.kindLabel },
        detailCol2: { heading: l3('المسار', 'Trajet & Tiers', 'Route & Party'), primaryText: it.primaryTitle, secondaryText: it.routeOrDetail },
        detailCol3: { heading: 'COD', primaryText: it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—', secondaryText: it.status },
      })}
      getFanActions={(it) => [
        { id: 'view', label: l3('التفاصيل', 'Détails', 'Inspect'), icon: <Eye className="w-[15px] h-[15px]" />, onClick: () => setSelectedItem(it) },
      ]}
      filterSections={
        stats.branchOptions.length > 0
          ? [{
              id: 'branch',
              label: l3('المحور', 'Hub / Agence', 'Hub'),
              value: branchFilter,
              onChange: setBranchFilter,
              kind: 'tiles',
              columns: 2,
              options: [{ value: 'All', label: l3('كل المراكز', 'Tous', 'All Hubs'), count: allItems.length }, ...stats.branchOptions],
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
          `atrium-logistics-history-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Type', 'Code', 'Recipient/Actor', 'Route/Channel', 'COD DZD', 'Status', 'Date'],
          sortedItems.map((i) => [i.kindLabel, i.code, i.primaryTitle, i.routeOrDetail, i.amountDzd, i.status, i.dateStr])
        )
      }
      entityPluralLabel={l3('طرود', 'mouvements', 'entries')}
      emptyTitle={l3('لا توجد عمليات لوجستية', 'Aucun historique logistique', 'No logistics history yet')}
      emptyDescription={l3('ستظهر الطرود والرحلات والأكياس والتحويلات هنا', 'Les colis, tournées, sacs et virements COD apparaîtront ici.', 'Shipments, manifests, bags, and COD payouts appear here.')}
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      inspectorConfig={{
        title: (it) => it.code,
        subtitle: (it) => `${it.kindLabel} · ${it.primaryTitle}`,
        categoryLabel: (it) => it.kindLabel,
        statusLabel: (it) => it.status,
        renderBody: (it) => (
          <InspectorSection index={0} title={l3('تفاصيل التوصيل', 'Détails Expédition', 'Logistics Record')}>
            <InspectorCard>
              <InspectorKeyValue label={l3('النوع', 'Type', 'Type')} value={it.kindLabel} />
              <InspectorKeyValue label={l3('الرمز', 'Tracking / Lot', 'Code')} value={it.code} mono />
              <InspectorKeyValue label={l3('المعني', 'Destinataire / Chauffeur', 'Recipient / Driver')} value={it.primaryTitle} />
              <InspectorKeyValue label={l3('المسار', 'Itinéraire / Canal', 'Route / Channel')} value={it.routeOrDetail} />
              <InspectorKeyValue label="COD" value={it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—'} mono />
              <InspectorKeyValue label={l3('الحالة', 'Statut', 'Status')} value={it.status} />
            </InspectorCard>
          </InspectorSection>
        ),
      }}
    />
  );
});
