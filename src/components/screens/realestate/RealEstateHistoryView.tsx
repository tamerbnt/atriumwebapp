import React, { useMemo, useState } from 'react';
import { History, Building2, Eye } from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { useRealEstateData } from './realEstateData';
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

interface RealEstateLedgerItem {
  id: string;
  group: 'mandates_visits' | 'quittances_inspections';
  kindLabel: string;
  title: string;
  partyName: string;
  subtitleText: string;
  amountDzd: number;
  status: string;
  dateStr: string;
  branchId?: string;
}

export const RealEstateHistoryView: React.FC = React.memo(() => {
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
  const { mandates, visits, quittances, inspections } = useRealEstateData();

  const isAr = language === 'ar';
  const isEn = language === 'en';
  const l3 = (ar: string, fr: string, en: string) => (isAr ? ar : isEn ? en : fr);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [selectedItem, setSelectedItem] = useState<RealEstateLedgerItem | null>(null);

  const branchesById = useMemo(() => buildBranchesByIdMap(branches), [branches]);

  const allItems = useMemo<RealEstateLedgerItem[]>(() => {
    const out: RealEstateLedgerItem[] = [];
    (mandates || []).forEach((m) => {
      out.push({
        id: `mnd_${m.id}`,
        group: 'mandates_visits',
        kindLabel: `${l3('وكالة', 'Mandat', 'Mandate')} ${m.mandateType}`,
        title: m.mandateNumber,
        partyName: m.ownerFullName,
        subtitleText: m.propertyTitle,
        amountDzd: m.askingPriceDzd || 0,
        status: m.status,
        dateStr: m.startDate || m.createdAt,
        branchId: m.branchId,
      });
    });
    (visits || []).forEach((v) => {
      out.push({
        id: `vis_${v.id}`,
        group: 'mandates_visits',
        kindLabel: l3('وصل زيارة', 'Bon de Visite', 'Property Visit'),
        title: v.propertyTitle,
        partyName: v.clientFullName,
        subtitleText: `${v.negotiatorName}${v.clientImpression ? ` · ${v.clientImpression}` : ''}`,
        amountDzd: v.counterOfferDzd || 0,
        status: v.clientImpression || 'Visite',
        dateStr: v.visitTimestamp || v.createdAt,
        branchId: v.branchId,
      });
    });
    (quittances || []).forEach((q) => {
      out.push({
        id: `qtc_${q.id}`,
        group: 'quittances_inspections',
        kindLabel: l3('وصل إيجار', 'Quittance', 'Rent Receipt'),
        title: q.quittanceNumber,
        partyName: q.tenantName,
        subtitleText: q.propertyTitle,
        amountDzd: q.totalCollectedDzd || 0,
        status: q.isDisbursedToOwner ? l3('مصروف للمالك', 'Reversé', 'Disbursed') : l3('محصل', 'Encaissé', 'Collected'),
        dateStr: q.paymentDate || q.createdAt,
        branchId: q.branchId,
      });
    });
    (inspections || []).forEach((ins) => {
      out.push({
        id: `ins_${ins.id}`,
        group: 'quittances_inspections',
        kindLabel: l3('معاينة عقار', 'État des Lieux', 'Inspection'),
        title: ins.propertyTitle,
        partyName: ins.tenantName || ins.inspectorName || 'Gestion',
        subtitleText: `${ins.type || ins.inspectionType || 'CheckIn'} · ${ins.generalCondition}`,
        amountDzd: 0,
        status: ins.generalCondition,
        dateStr: ins.inspectionDate || ins.createdAt || new Date().toISOString(),
        branchId: ins.branchId,
      });
    });
    return out;
  }, [mandates, visits, quittances, inspections, isAr, isEn]);

  const stats = useMemo(() => {
    const mvCount = allItems.filter((i) => i.group === 'mandates_visits').length;
    const qiCount = allItems.filter((i) => i.group === 'quittances_inspections').length;
    const rentCollected = (quittances || []).reduce((s, q) => s + (q.totalCollectedDzd || 0), 0);
    const branchCounts = new Map<string, number>();
    allItems.forEach((it) => {
      const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
      branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
    });
    return {
      totalCount: allItems.length,
      mvCount,
      qiCount,
      rentCollected,
      branchOptions: Array.from(branchCounts.entries()).map(([name, count]) => ({ value: name, label: name, count })),
    };
  }, [allItems, quittances, branchesById, currentBranch, language]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((it) => {
      if (statusFilter === 'mandates_visits' && it.group !== 'mandates_visits') return false;
      if (statusFilter === 'quittances_inspections' && it.group !== 'quittances_inspections') return false;
      if (branchFilter !== 'All') {
        const bName = resolveRecordBranch(it, branchesById, currentBranch, language).name;
        if (bName !== branchFilter) return false;
      }
      if (q) {
        const hay = `${it.title} ${it.partyName} ${it.subtitleText} ${it.kindLabel}`.toLowerCase();
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

  const columns = useMemo<ColumnDefinition<RealEstateLedgerItem>[]>(
    () => [
      {
        key: 'title',
        header: l3('المرجع والعقار', 'Référence & Bien', 'Ref & Property'),
        sortable: true,
        renderCell: (it) => (
          <div className="min-w-0">
            <span className="t-label font-semibold text-black dark:text-white truncate block">{it.title}</span>
            <span className="t-cap text-black/62 dark:text-white/65 truncate block">{it.kindLabel} · {it.subtitleText}</span>
          </div>
        ),
      },
      {
        key: 'party',
        header: l3('المالك / المستأجر', 'Propriétaire / Locataire', 'Owner / Tenant'),
        renderCell: (it) => <span className="t-small font-medium text-black dark:text-white truncate block">{it.partyName}</span>,
      },
      {
        key: 'amount',
        header: l3('القيمة والتاريخ', 'Montant & Date', 'Amount & Date'),
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
    <VerticalHistoryScaffold<RealEstateLedgerItem>
      icon={<History size={22} />}
      title={l3('سجل العقارات والوكالات', 'Historique Immobilier & Gestion', 'Real Estate History')}
      primaryAction={{
        label: l3('العقارات', 'Biens', 'Properties'),
        icon: <Building2 size={16} />,
        onClick: () => setScreen('members'),
      }}
      kpiHeading={l3('تدقيق الوكالات والزيارات والإيجارات', 'Audit Mandats 09-18, Visites & Quittances', 'Brokerage & Rental Audit')}
      primaryCard={{
        label: l3('الوكالات والزيارات', 'Mandats & Visites', 'Mandates & Visits'),
        badgeText: `${stats.mvCount} dossiers`,
        count: stats.mvCount,
        tone: 'emerald',
        isActive: statusFilter === 'mandates_visits',
        onToggle: () => setStatusFilter((p) => (p === 'mandates_visits' ? 'all' : 'mandates_visits')),
      }}
      secondaryCard={{
        label: l3('الإيصالات والمعاينات', 'Quittances & États', 'Receipts & Inspections'),
        badgeText: `${stats.qiCount} actes`,
        count: stats.qiCount,
        tone: 'terracotta',
        isActive: statusFilter === 'quittances_inspections',
        onToggle: () => setStatusFilter((p) => (p === 'quittances_inspections' ? 'all' : 'quittances_inspections')),
      }}
      darkCard={{
        label: l3('إجمالي الإيجارات المحصلة', 'Loyers Encaissés (Quittances)', 'Rent Collected'),
        badgePrefix: '',
        badgeCount: stats.totalCount,
        badgeSuffix: l3('سجلات', 'actes', 'records'),
        valuePrefix: '',
        valueCount: stats.rentCollected,
        formatValue: (n) => formatMoney(n),
        caption: `${currentBranch?.name || 'Agence'} · Décret 09-18`,
      }}
      podTitle={l3('أرشيف العقارات والإدارة', 'Registre Transactions & Gestion Locative', 'Property & Rental Ledger')}
      searchPlaceholder={l3('بحث بالوكالة، العقار، المستأجر...', 'Rechercher mandat, bien, quittance...', 'Search mandate, property, tenant...')}
      vertical="real_estate"
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
        { value: 'mandates_visits', label: l3('الوكالات والزيارات', 'Mandats & Visites', 'Mandates & Visits'), count: stats.mvCount },
        { value: 'quittances_inspections', label: l3('الإيصالات والمعاينات', 'Quittances & États', 'Receipts & States'), count: stats.qiCount },
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
        subline: `${it.kindLabel} · ${it.partyName} · ${it.subtitleText}`,
        categoryLabel: it.kindLabel,
        statusLabel: it.status,
        statusVariant: it.group === 'quittances_inspections' ? 'active' : 'warning',
        metricPrimary: it.amountDzd > 0 ? formatMoney(it.amountDzd) : it.status,
        metricSecondary: new Date(it.dateStr).toLocaleDateString(),
        detailCol1: { heading: l3('المرجع', 'Pièce', 'Ref'), primaryText: it.title, secondaryText: it.kindLabel },
        detailCol2: { heading: l3('الطرف والعقار', 'Client & Bien', 'Party & Property'), primaryText: it.partyName, secondaryText: it.subtitleText },
        detailCol3: { heading: l3('المبلغ', 'Montant', 'Amount'), primaryText: it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—', secondaryText: it.status },
      })}
      getFanActions={(it) => [
        { id: 'view', label: l3('التفاصيل', 'Détails', 'Inspect'), icon: <Eye className="w-[15px] h-[15px]" />, onClick: () => setSelectedItem(it) },
      ]}
      filterSections={
        stats.branchOptions.length > 0
          ? [{
              id: 'branch',
              label: l3('الوكالة', 'Agence', 'Branch'),
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
          `atrium-realestate-history-${new Date().toISOString().slice(0, 10)}.csv`,
          ['Type', 'Title', 'Party', 'Property', 'Amount DZD', 'Status', 'Date'],
          sortedItems.map((i) => [i.kindLabel, i.title, i.partyName, i.subtitleText, i.amountDzd, i.status, i.dateStr])
        )
      }
      entityPluralLabel={l3('سجلات', 'actes', 'records')}
      emptyTitle={l3('لا توجد سجلات عقارية', 'Aucun historique immobilier', 'No real estate history yet')}
      emptyDescription={l3('ستظهر الوكالات والزيارات والإيصالات والمعاينات هنا', 'Les mandats, visites, quittances et états des lieux apparaîtront ici.', 'Mandates, visits, receipts, and inspections appear here.')}
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      inspectorConfig={{
        title: (it) => it.title,
        subtitle: (it) => `${it.kindLabel} · ${it.partyName}`,
        categoryLabel: (it) => it.kindLabel,
        statusLabel: (it) => it.status,
        renderBody: (it) => (
          <InspectorSection index={0} title={l3('تفاصيل المعاملة العقارية', 'Détails Acte Immobilier', 'Real Estate Record')}>
            <InspectorCard>
              <InspectorKeyValue label={l3('النوع', 'Type', 'Type')} value={it.kindLabel} />
              <InspectorKeyValue label={l3('المرجع', 'Référence', 'Ref')} value={it.title} mono />
              <InspectorKeyValue label={l3('المعني', 'Tiers', 'Party')} value={it.partyName} />
              <InspectorKeyValue label={l3('العقار', 'Bien', 'Property')} value={it.subtitleText} />
              <InspectorKeyValue label={l3('القيمة', 'Montant', 'Amount')} value={it.amountDzd > 0 ? formatMoney(it.amountDzd) : '—'} mono />
              <InspectorKeyValue label={l3('الحالة', 'Statut', 'Status')} value={it.status} />
            </InspectorCard>
          </InspectorSection>
        ),
      }}
    />
  );
});
